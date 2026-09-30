import { errorMessage } from '@/api/client';
import { showMessage } from '@/store/ui';

/** Runs an API action, shows its error as a toast, and returns whether it succeeded. */
export async function runAction(action: () => Promise<unknown>, success?: string): Promise<boolean> {
  try {
    await action();
    if (success) showMessage(success);
    return true;
  } catch (e) {
    showMessage(errorMessage(e), true);
    return false;
  }
}
