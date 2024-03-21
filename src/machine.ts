import { Context } from "telegraf";
import type { IAction, IActionMachine, R } from "./types";

export class ActionMachine<C extends Context & { action: IActionMachine }> {
  private actions = new Map<string, IAction<C>>();
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
    const actionContext: IActionMachine = {
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

    console.log(actionID);

    const action = this.actions.get(actionID)!;

    if (action.filter && (await action.filter(ctx))) {
      return;
    }

    action.result && (await action.result(ctx));

    actions.shift();

    if (!actions.length) {
      this.chats.delete(chatID);
    } else {
      const { actionID, payLoad } = actions.at(0)!;
      const action = this.actions.get(actionID)!;
      action.send(ctx, payLoad);
    }

    return await next();
  }

  createAction<S extends R = R, P extends R = R>(name: string) {
    const action: IAction<C, S, P> = {
      send: () => {},
    };

    this.actions.set(name, action);

    return action;
  }
}
