import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { BanknoteIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import type {
  OTPAuthenticationRequest,
  RequestAuthenticationRequest,
} from "@repo/validators/user";
import {
  OTPAuthenticationRequestSchema,
  requestAuthenticationRequestSchema,
} from "@repo/validators/user";
import { Button } from "@repo/web-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/web-ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@repo/web-ui/field";
import { Input } from "@repo/web-ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/web-ui/input-otp";

import {
  authenticateWithOp,
  requestAuthentication,
} from "../services/authService";
import { useAuthStore } from "../stores/authStore";

type LoginPhase = "phoneNumber" | "OTPCode";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

interface PhoneNumberLoginPhaseProps {
  onSubmit: (data: RequestAuthenticationRequest) => void;
}

function PhoneNumberLoginPhase({ onSubmit }: PhoneNumberLoginPhaseProps) {
  const form = useForm<RequestAuthenticationRequest>({
    resolver: zodResolver(requestAuthenticationRequestSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldGroup>
          <Controller
            control={form.control}
            name="phoneNumber"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="phoneNumber">Phone number</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id="phoneNumber"
                  type="tel"
                  placeholder="+3586864371"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
        <Field>
          <Button type="submit">Log In</Button>
        </Field>
      </FieldSet>
    </form>
  );
}

interface OTPCodeLoginPhaseProps {
  onSubmit: (data: OTPAuthenticationRequest) => void;
  phoneNumber: string;
}

function OTPCodeLoginPhase({ onSubmit, phoneNumber }: OTPCodeLoginPhaseProps) {
  const form = useForm({
    resolver: zodResolver(OTPAuthenticationRequestSchema),
    defaultValues: {
      phoneNumber,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldGroup>
          <Controller
            control={form.control}
            name="code"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Authentication code</FieldLabel>
                <InputOTP
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id="OTPCode"
                  maxLength={6}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
        <Field>
          <Button type="submit">Log In</Button>
        </Field>
      </FieldSet>
    </form>
  );
}

function RouteComponent() {
  const [loginPhase, setLoginPhase] = useState<LoginPhase>("phoneNumber");
  const [savedPhoneNumber, setSavedPhoneNumber] = useState<string | null>(null);
  const { setSession } = useAuthStore();
  const { navigate } = useRouter();

  const onPhoneNumberSubmit = async (data: RequestAuthenticationRequest) => {
    await requestAuthentication(data);
    setSavedPhoneNumber(data.phoneNumber);
    setLoginPhase("OTPCode");
  };

  const onOtpSubmit = async (data: OTPAuthenticationRequest) => {
    const session = await authenticateWithOp(data);
    setSession(session);
    await navigate({ to: "/dashboard" });
  };

  return (
    <div className="m-auto w-full max-w-sm self-center md:max-w-4xl">
      <Card className="flex flex-row gap-0 overflow-clip p-0">
        <div className="flex w-full flex-col justify-around gap-8 px-4 py-6 md:w-1/2">
          <CardHeader className="w-full">
            <div className="flex w-full items-center justify-evenly gap-3">
              <span className="bg-muted-foreground h-px w-full" />
              <div className="text-muted-foreground bg-muted border-muted-foreground rounded-full border p-2">
                <BanknoteIcon />
              </div>
              <span className="bg-muted-foreground h-px w-full" />
            </div>
            <CardTitle className="text-center">
              {loginPhase === "phoneNumber"
                ? "Welcome Back!"
                : "Authentication required"}
            </CardTitle>
            <CardDescription className="text-center">
              {loginPhase === "phoneNumber"
                ? "Log back in using your phone number"
                : "We have sent you an authentication code to your phone"}
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full">
            {loginPhase == "phoneNumber" ? (
              <PhoneNumberLoginPhase onSubmit={onPhoneNumberSubmit} />
            ) : (
              <OTPCodeLoginPhase
                onSubmit={onOtpSubmit}
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                phoneNumber={savedPhoneNumber!}
              />
            )}
          </CardContent>
          <div /> {/* An empty div to space out the ui evenly */}
        </div>
        <div className="bg-muted text-muted-foreground flex w-1/2 items-center justify-center max-md:collapse max-md:w-0">
          <BanknoteIcon size={48} />
        </div>
      </Card>
    </div>
  );
}
