import type { FormEvent, FormEventHandler } from "react";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BanknoteIcon } from "lucide-react";

import { Button } from "@repo/web-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/web-ui/card";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@repo/web-ui/field";
import { Input } from "@repo/web-ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/web-ui/input-otp";

type LoginPhase = "phoneNumber" | "OTPCode";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

interface PhoneNumberLoginPhaseProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
}

function PhoneNumberLoginPhase({ onSubmit }: PhoneNumberLoginPhaseProps) {
  return (
    <form onSubmit={onSubmit}>
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="phoneNumber">Phone number</FieldLabel>
            <Input id="phoneNumber" type="tel" placeholder="+358 686 4371" />
          </Field>
        </FieldGroup>
        <Field>
          <Button type="submit">Log In</Button>
        </Field>
      </FieldSet>
    </form>
  );
}

interface OTPCodeLoginPhaseProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
}

function OTPCodeLoginPhase({ onSubmit }: OTPCodeLoginPhaseProps) {
  return (
    <form onSubmit={onSubmit}>
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel>Authentication code</FieldLabel>
            <InputOTP id="OTPCode" maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </Field>
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

  const onPhoneNumberSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoginPhase("OTPCode");
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
                onSubmit={() => {
                  /* empty */
                }}
              />
            )}
          </CardContent>
          <div /> {/* An empty div to space out the ui evenly */}
        </div>
        <div className="bg-muted text-muted-foreground flex w-1/2 items-center justify-center max-md:collapse">
          <BanknoteIcon size={48} />
        </div>
      </Card>
    </div>
  );
}
