import type { Dispatch } from "react";
import { WalletIcon } from "lucide-react";

import { Button } from "@repo/web-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/web-ui/card";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@repo/web-ui/field";
import { Input } from "@repo/web-ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/web-ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/web-ui/tabs";

import { ResponsiveDialog } from "./responsiveDialog";

export type TransactionDialogState =
  | "deposit"
  | "withdraw"
  | "send"
  | "request";

export interface TransactionDialogProps {
  open: boolean;
  setOpen: Dispatch<boolean>;
  state: TransactionDialogState;
  setState: Dispatch<TransactionDialogState>;
}

function DepositTab() {
  return (
    <form>
      <FieldSet>
        <FieldGroup>
          <FieldSet>
            <Field>
              <FieldLabel>Amount</FieldLabel>
              <InputGroup>
                <InputGroupInput placeholder="0.00" />
                <InputGroupAddon align="inline-end">€</InputGroupAddon>
              </InputGroup>
            </Field>

            <div>
              <p className="text-foreground">Payment</p>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Space I left out for the stripe integration :)
                  </CardTitle>
                </CardHeader>
                <CardContent></CardContent>
              </Card>
            </div>

            <Field>
              <Button>
                <WalletIcon /> Deposit
              </Button>
            </Field>
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function WithdrawTab() {
  return (
    <form>
      <FieldSet>
        <FieldGroup>
          <FieldSet>
            <Field>
              <FieldLabel>Amount</FieldLabel>
              <InputGroup>
                <InputGroupInput placeholder="0.00" />
                <InputGroupAddon align="inline-end">€</InputGroupAddon>
              </InputGroup>
            </Field>

            <div>
              <p className="text-foreground">Payment</p>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Space I left out for the stripe integration :)
                  </CardTitle>
                </CardHeader>
                <CardContent></CardContent>
              </Card>
            </div>

            <Field>
              <Button>
                <WalletIcon /> Deposit
              </Button>
            </Field>
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function SendTab() {
  return (
    <form>
      <FieldSet>
        <FieldGroup>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <InputGroup>
                <InputGroupInput itemID="amount" placeholder="0.00" />
                <InputGroupAddon align="inline-end">€</InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="recipient">Recipient</FieldLabel>
              <Input id="recipient" type="tel" placeholder="+3586864371" />
            </Field>

            <Field>
              <Button>
                <WalletIcon /> Deposit
              </Button>
            </Field>
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function RequestTab() {
  return (
    <form>
      <FieldSet>
        <FieldGroup>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <InputGroup>
                <InputGroupInput itemID="amount" placeholder="0.00" />
                <InputGroupAddon align="inline-end">€</InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="recipient">Recipient</FieldLabel>
              <Input id="recipient" type="tel" placeholder="+3586864371" />
            </Field>

            <Field>
              <Button>
                <WalletIcon /> Deposit
              </Button>
            </Field>
          </FieldSet>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

export function TransactionDialog({
  open,
  setOpen,
  state,
  setState,
}: TransactionDialogProps) {
  return (
    <ResponsiveDialog open={open} setOpen={setOpen}>
      <Tabs
        className="max-w-xl px-3 py-6"
        defaultValue={state}
        onValueChange={(newState) =>
          setState(newState as TransactionDialogState)
        }
      >
        <TabsList className="max-md:w-full">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="request">Request</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <DepositTab />
        </TabsContent>
        <TabsContent value="withdraw">
          <WithdrawTab />
        </TabsContent>
        <TabsContent value="send">
          <SendTab />
        </TabsContent>
        <TabsContent value="request">
          <RequestTab />
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  );
}
