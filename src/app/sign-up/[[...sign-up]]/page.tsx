"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
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

        <SignUp.Root>
          <SignUp.Step name="start">
            <div className="space-y-5">
              <Clerk.Field name="emailAddress">
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

              <SignUp.Action submit asChild>
                <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                  Crear cuenta
                </Button>
              </SignUp.Action>

              <Clerk.GlobalError className="text-red-500 text-sm text-center" />
            </div>
          </SignUp.Step>

          <SignUp.Step name="verifications">
            <SignUp.Strategy name="email_code">
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

                <SignUp.Action submit asChild>
                  <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                    Verificar
                  </Button>
                </SignUp.Action>
              </div>
            </SignUp.Strategy>
          </SignUp.Step>

          <SignUp.Step name="continue">
            <div className="space-y-5">
              <Clerk.Field name="firstName">
                <Clerk.Label asChild>
                  <Label className="text-neutral-600 text-sm font-medium">
                    Nombre
                  </Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    placeholder="Tu nombre"
                    className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-red-500 text-xs mt-1" />
              </Clerk.Field>

              <Clerk.Field name="lastName">
                <Clerk.Label asChild>
                  <Label className="text-neutral-600 text-sm font-medium">
                    Apellido
                  </Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    placeholder="Tu apellido"
                    className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-red-500 text-xs mt-1" />
              </Clerk.Field>

              <SignUp.Action submit asChild>
                <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                  Continuar
                </Button>
              </SignUp.Action>
            </div>
          </SignUp.Step>
        </SignUp.Root>

        <p className="mt-8 text-center text-sm text-neutral-500">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/sign-in"
            className="text-neutral-900 font-medium hover:underline"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

