import type { Dispatch, ReactNode } from "react";
import { useMediaQuery } from "@uidotdev/usehooks";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@repo/web-ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@repo/web-ui/drawer";

interface ResponsiveDialogProps {
  open: boolean;
  setOpen: Dispatch<boolean>;
  children?: ReactNode;
}

export function ResponsiveDialog({
  open,
  setOpen,
  children,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Transaction dialog</DialogTitle>
        <DialogDescription className="sr-only">
          A dialog to send, deposit, and withdraw funds.
        </DialogDescription>
        <DialogContent>{children}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTitle className="sr-only">Transaction dialog</DrawerTitle>
      <DrawerDescription className="sr-only">
        A dialog to send, deposit, and withdraw funds.
      </DrawerDescription>
      <DrawerContent>{children}</DrawerContent>
    </Drawer>
  );
}
