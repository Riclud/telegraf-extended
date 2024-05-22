import { Context } from "telegraf";
import type { ActionContext, ActionMachineContext, R } from "./types";
import { Action } from "./action";

export class ActionMachine<
  C extends Context & { action: ActionMachineContext }
> {
  private actions = new Map<string, ActionContext<C>>();
  private chats = new Map<number, { actionID: string; payLoad?: R }[]>();
  private states = new Map<number, R>();

  middleware() {
    return async (ctx: C, next: Function) => {
      const chatID = ctx.chat?.id;
      if (!chatID) return;

      this.inject(ctx, chatID);
      this.handler(ctx, next, chatID);
    };
  }

  private inject(ctx: C, chatID: number) {
    const actionContext: ActionMachineContext = {
      enter: (name, payLoad) => {
        const action = this.actions.get(name);

        if (action) {
          const chat = this.chats.get(chatID);

          if (!chat) {
            this.chats.set(chatID, [{ actionID: name, payLoad }]);

            return action.send(ctx, payLoad);
          }

          chat.push({ actionID: name, payLoad });
        }
      },

      clearState: () => this.states.set(chatID, {}),

      state: {},
    };

    Object.defineProperty(actionContext, "state", {
      get: () => {
        const state = this.states.get(chatID);

        if (state) {
          return state;
        }

        return this.states.set(chatID, {}).get(chatID);
      },
      set: (value) => {
        this.states.set(chatID, value);
      },
    });

    ctx.action = actionContext;
  }

  private async handler(ctx: C, next: Function, chatID: number) {
    const actions = this.chats.get(chatID);

    if (!actions || !actions.length) {
      return await next();
    }

    const { actionID } = actions.at(0)!;

    const action = this.actions.get(actionID)!;

    if (action.filter && !(await action.filter(ctx))) {
      return;
    }

    action.result && (await action.result(ctx));

    actions.shift();

    if (!actions.length) {
      this.chats.delete(chatID);
      // return await next();
    } else {
      const { actionID, payLoad } = actions.at(0)!;
      const action = this.actions.get(actionID)!;
      await action.send(ctx, payLoad);
    }
  }

  connect(name: string, action: Action<C>) {
    this.actions.set(name, action["fns"]);
  }

  connectClass(name: string, actionInstance: ActionContext<C>) {
    this.actions.set(name, actionInstance);
  }
}
