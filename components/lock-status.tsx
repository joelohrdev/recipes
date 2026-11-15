import { isUnlocked } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { Lock } from "./icons";

/** While editing is unlocked on this device, offers to lock it again. */
export async function LockStatus() {
  if (!(await isUnlocked())) return null;
  return (
    <form action={logoutAction}>
      <button className="btn-quiet max-sm:px-2.5" title="Ask for the passcode again">
        <Lock />
        <span className="max-sm:hidden">Lock</span>
      </button>
    </form>
  );
}
