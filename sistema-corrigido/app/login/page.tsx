"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>Acesso ao Sistema</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          providers={[]}
          localization={{
            variables: {
              sign_in: { 
                email_label: 'Seu e-mail', 
                password_label: 'Sua senha', 
                button_label: 'Entrar',
                link_text: 'Já tem uma conta? Entre'
              },
              sign_up: { 
                email_label: 'Seu e-mail', 
                password_label: 'Crie uma senha', 
                button_label: 'Registrar',
                link_text: 'Não tem uma conta? Registre-se'
              },
            },
          }}
        />
      </div>
    </div>
  );
}
