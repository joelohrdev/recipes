import { isUnlocked } from "@/lib/auth";
import { logoutAction } from "@/app/actions";

/** Shows a "Lock" button while editing is unlocked on this device. */
export async function LockStatus() {
  if (!(await isUnlocked())) return null;
  return (
    <form action={logoutAction}>
      <button className="btn px-4 text-sm text-muted" title="Require the passcode again">
        🔓 Lock
      </button>
    </form>
  );
}
