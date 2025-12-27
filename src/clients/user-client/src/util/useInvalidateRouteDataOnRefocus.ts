import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

export function useInvalidateRouteDataOnRefocus() {
  const router = useRouter();

  useEffect(() => {
    const handleDataInvalidation = () => {
      if (!document.hidden) {
        void router.invalidate({ sync: true });
      }
    };

    document.addEventListener("visibilitychange", handleDataInvalidation);

    return () => {
      document.removeEventListener("visibilitychange", handleDataInvalidation);
    };
  }, [router]);
}
