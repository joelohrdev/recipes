import { Suspense } from "react";
import { PasscodePad } from "@/components/passcode-pad";
import { Lock } from "@/components/icons";

export const metadata = { title: "Unlock" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-sm pt-4">
      <Lock className="h-9 w-9 text-cobalt" />
      <h1 className="mt-3 font-slab text-[2.5rem] font-bold leading-tight">Enter the passcode</h1>
      <p className="mt-2 text-lg text-ink-soft">
        Changing recipes or the dinner plan needs the passcode. This iPad will remember it for
        90 days.
      </p>
      <Suspense>
        <Pad searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Pad({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  // Only the length is sent to the page, so it can unlock as soon as the last
  // digit is typed. The passcode itself never leaves the server.
  const length = process.env.RECIPE_PASSCODE?.length ?? null;
  return <PasscodePad next={typeof next === "string" ? next : "/"} length={length} />;
}
