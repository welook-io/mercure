"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm px-6">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo_remito2.png"
            alt="Mercure"
            width={280}
            height={80}
            priority
            className="mb-2"
          />
        </div>

        <SignIn.Root>
          <SignIn.Step name="start">
            <div className="space-y-5">
              <Clerk.Field name="identifier">
                <Clerk.Label asChild>
                  <Label className="text-neutral-600 text-sm font-medium">
                    Email
                  </Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-red-500 text-xs mt-1" />
              </Clerk.Field>

              <Clerk.Field name="password">
                <Clerk.Label asChild>
                  <Label className="text-neutral-600 text-sm font-medium">
                    Contraseña
                  </Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-red-500 text-xs mt-1" />
              </Clerk.Field>

              <SignIn.Action submit asChild>
                <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                  Iniciar sesión
                </Button>
              </SignIn.Action>

              <Clerk.GlobalError className="text-red-500 text-sm text-center" />
            </div>
          </SignIn.Step>

          <SignIn.Step name="verifications">
            <SignIn.Strategy name="email_code">
              <div className="space-y-5">
                <p className="text-neutral-600 text-sm text-center">
                  Ingresá el código enviado a tu email
                </p>
                <Clerk.Field name="code">
                  <Clerk.Label asChild>
                    <Label className="text-neutral-600 text-sm font-medium">
                      Código de verificación
                    </Label>
                  </Clerk.Label>
                  <Clerk.Input asChild>
                    <Input
                      placeholder="123456"
                      className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0 text-center tracking-widest"
                    />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-red-500 text-xs mt-1" />
                </Clerk.Field>

                <SignIn.Action submit asChild>
                  <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                    Verificar
                  </Button>
                </SignIn.Action>
              </div>
            </SignIn.Strategy>

            <SignIn.Strategy name="password">
              <div className="space-y-5">
                <Clerk.Field name="password">
                  <Clerk.Label asChild>
                    <Label className="text-neutral-600 text-sm font-medium">
                      Contraseña
                    </Label>
                  </Clerk.Label>
                  <Clerk.Input asChild>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0"
                    />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-red-500 text-xs mt-1" />
                </Clerk.Field>

                <SignIn.Action submit asChild>
                  <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                    Continuar
                  </Button>
                </SignIn.Action>
              </div>
            </SignIn.Strategy>
          </SignIn.Step>
        </SignIn.Root>

        <p className="mt-8 text-center text-sm text-neutral-500">
          ¿No tenés cuenta?{" "}
          <Link
            href="/sign-up"
            className="text-neutral-900 font-medium hover:underline"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}

