/**
 * Virtual controller state written by the on-screen touch buttons and read by
 * the world scene alongside the keyboard.
 */
export class VirtualPad {
  left = false;
  right = false;
  jumpHeld = false;
  private jumpQueued = false;
  private actionQueued = false;

  pressJump(): void {
    this.jumpHeld = true;
    this.jumpQueued = true;
  }

  releaseJump(): void {
    this.jumpHeld = false;
  }

  pressAction(): void {
    this.actionQueued = true;
  }

  /** Returns true once per press. */
  consumeJump(): boolean {
    const q = this.jumpQueued;
    this.jumpQueued = false;
    return q;
  }

  consumeAction(): boolean {
    const q = this.actionQueued;
    this.actionQueued = false;
    return q;
  }

  reset(): void {
    this.left = this.right = this.jumpHeld = this.jumpQueued = this.actionQueued = false;
  }
}
