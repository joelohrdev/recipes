import { Suspense } from "react";
import { PasscodePad } from "@/components/passcode-pad";

export const metadata = { title: "Unlock" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto mt-6 max-w-sm text-center">
      <h1 className="font-display text-3xl font-semibold">Enter passcode</h1>
      <p className="mt-2 text-muted">Needed to add, edit or delete recipes.</p>
      <Suspense>
        <Pad searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Pad({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <PasscodePad next={typeof next === "string" ? next : "/"} />;
}
