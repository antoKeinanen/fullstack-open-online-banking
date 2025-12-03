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
import { Checkbox } from "@repo/web-ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@repo/web-ui/field";
import { Input } from "@repo/web-ui/input";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="m-auto w-full max-w-sm self-center md:max-w-4xl max-h-2/3">
      <Card className="flex h-full flex-row gap-0 overflow-clip p-0">
        <div className="flex w-full flex-col justify-around gap-8 px-4 py-6 md:w-1/2">
          <CardHeader className="w-full">
            <CardTitle className="text-center">Nice to meet you!</CardTitle>
            <CardDescription className="text-center">
              Please provide the following information so we can get started
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <form>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>About you</FieldLegend>
                  <FieldDescription>
                    We need to know a few things about you to get started
                  </FieldDescription>

                  <FieldGroup>
                    <div className="grid grid-cols-2 gap-2">
                      <Field>
                        <FieldLabel required htmlFor="firstName">
                          First name(s)
                        </FieldLabel>
                        <Input id="firstName" type="text" />
                      </Field>
                      <Field>
                        <FieldLabel required htmlFor="lastName">
                          Last name
                        </FieldLabel>
                        <Input id="lastName" type="text" />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel required htmlFor="phoneNumber">
                        Phone number
                      </FieldLabel>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+3586864371"
                      />
                    </Field>

                    <FieldSeparator />

                    <Field>
                      <FieldLabel required htmlFor="address">
                        Home address
                      </FieldLabel>
                      <Input type="text" id="address" />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field>
                        <FieldLabel required htmlFor="postcode">
                          Postcode
                        </FieldLabel>
                        <Input id="postcode" type="text" />
                      </Field>
                      <Field>
                        <FieldLabel required htmlFor="city">
                          city
                        </FieldLabel>
                        <Input id="city" type="text" />
                      </Field>
                    </div>

                    <FieldSeparator />

                    <div className="grid grid-cols-3 gap-2">
                      <Field>
                        <FieldLabel required htmlFor="birthDay">
                          Day
                        </FieldLabel>
                        <Input id="birthDay" type="number" min="1" max="31" />
                      </Field>
                      <Field>
                        <FieldLabel required htmlFor="birthMonth">
                          Month
                        </FieldLabel>
                        <Input id="birthMonth" type="number" min="1" max="12" />
                      </Field>
                      <Field>
                        <FieldLabel required htmlFor="birthYear">
                          Year
                        </FieldLabel>
                        <Input id="birthYear" type="number" />
                      </Field>
                    </div>
                  </FieldGroup>

                  <FieldSeparator />

                  <Field orientation="horizontal">
                    <Checkbox id="isResident" />
                    <FieldLabel required htmlFor="isResident">
                      I am a resident of Finland
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id="isTruth" />
                    <FieldLabel required htmlFor="isTruth">
                      I hereby informing that the above mentioned all
                      information is correct and true as the best of my
                      knowledge and experience.
                    </FieldLabel>
                  </Field>

                  <Field>
                    <Button type="submit">Sign up</Button>
                  </Field>
                </FieldSet>
              </FieldGroup>
            </form>
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
