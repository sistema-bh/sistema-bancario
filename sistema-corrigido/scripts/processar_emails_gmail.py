#!/usr/bin/env python3
"""
Script para processar e-mails do Gmail usando MCP e enviar para a API do sistema.
Este script deve ser executado periodicamente (ex: a cada 5 minutos via cron job).
"""

import subprocess
import json
import requests
import sys
from datetime import datetime, timedelta

# Configurações
SITE_URL = "https://seu-site.vercel.app"  # Substituir pela URL real do site
API_ENDPOINT = f"{SITE_URL}/api/processar-emails"

def executar_mcp_command(command):
    """Executa um comando MCP e retorna o resultado."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Erro ao executar comando MCP: {e}")
        print(f"Saída de erro: {e.stderr}")
        return None

def buscar_emails_pix():
    """Busca e-mails de notificação de PIX do Itaú."""
    # Query para buscar e-mails do Itaú sobre PIX recebidos nos últimos 10 minutos
    # Ajuste a query conforme o formato real dos e-mails do seu banco
    data_limite = (datetime.now() - timedelta(minutes=10)).strftime("%Y/%m/%d")
    
    query = f'from:itau@itau.com.br subject:"PIX" after:{data_limite} is:unread'
    
    # Buscar mensagens usando o MCP do Gmail
    command = f'manus-mcp-cli tool call gmail_search_messages --server gmail --input \'{{"q": "{query}", "max_results": 50}}\' '
    
    print(f"Buscando e-mails com query: {query}")
    resultado = executar_mcp_command(command)
    
    if not resultado:
        return []
    
    try:
        # O resultado do MCP vem em formato de texto, precisamos parsear
        # Assumindo que retorna JSON
        dados = json.loads(resultado)
        return dados.get("messages", [])
    except json.JSONDecodeError:
        print("Erro ao decodificar resposta do MCP")
        return []

def ler_thread_completo(thread_id):
    """Lê o conteúdo completo de um thread do Gmail."""
    command = f'manus-mcp-cli tool call gmail_read_threads --server gmail --input \'{{"thread_ids": ["{thread_id}"], "include_full_messages": true}}\' '
    
    resultado = executar_mcp_command(command)
    
    if not resultado:
        return None
    
    try:
        dados = json.loads(resultado)
        # O MCP retorna uma lista de threads, pegamos o primeiro
        thread = dados.get("threads", [{}])[0]
        # O corpo completo pode estar em diferentes lugares dependendo do formato do e-mail
        # Vamos tentar pegar o snippet ou a parte de texto do corpo
        for msg in thread.get("messages", []):
            payload = msg.get("payload", {})
            parts = payload.get("parts", [])
            for part in parts:
                if part.get("mimeType") == "text/plain":
                    data = part.get("body", {}).get("data", "")
                    if data:
                        # Decodificar base64
                        return base64.urlsafe_b64decode(data).decode("utf-8")
        return thread.get("snippet", "") # Fallback para snippet
    except json.JSONDecodeError:
        print(f"Erro ao decodificar thread {thread_id}")
        return None
    except Exception as e:
        print(f"Erro ao extrair corpo do e-mail {thread_id}: {e}")
        return None

def processar_emails():
    """Função principal que processa os e-mails."""
    print(f"[{datetime.now()}] Iniciando processamento de e-mails...")
    
    # Buscar e-mails
    mensagens = buscar_emails_pix()
    
    if not mensagens:
        print("Nenhum e-mail novo de PIX encontrado.")
        return
    
    print(f"Encontrados {len(mensagens)} e-mails para processar.")
    
    emails_processados = []
    
    for msg in mensagens:
        thread_id = msg.get("threadId")
        if not thread_id:
            continue
        
        # Ler o conteúdo completo
        email_body = ler_thread_completo(thread_id)
        
        if not email_body:
            continue
        
        emails_processados.append({
            "id": msg.get("id"),
            "thread_id": thread_id,
            "body": email_body,
            "subject": msg.get("subject", ""),
            "from": msg.get("from", "")
        })
    
    if not emails_processados:
        print("Nenhum e-mail válido para processar.")
        return
    
    # Enviar para a API do sistema
    try:
        response = requests.post(
            API_ENDPOINT,
            json={"emails": emails_processados},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            resultado = response.json()
            print(f"Processamento concluído com sucesso!")
            print(f"Resultados: {json.dumps(resultado, indent=2)}")
        else:
            print(f"Erro na API: {response.status_code}")
            print(f"Resposta: {response.text}")
    
    except requests.RequestException as e:
        print(f"Erro ao chamar API: {e}")

if __name__ == "__main__":
    try:
        processar_emails()
    except Exception as e:
        print(f"Erro fatal: {e}")
        sys.exit(1)
