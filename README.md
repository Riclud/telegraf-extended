# ActionMachine :sparkles:

Created with the aim of simplifying scene management and extracting repetitive logic into separate modules

## Installation

#### NPM

```bash
npm i telegraf-extended
```

#### BUN

```bash
bun add telegraf-extended
```

---

## Example

```typescript
import { Context, Telegraf } from "telegraf";
import { ActionMachine, ActionMachineContext } from "telegraf-extended";

interface MyContext extends Context {
  action: ActionMachineContext;
}

const actionMachine = new ActionMachine<MyContext>();

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN);
bot.use(actionMachine.middleware());

bot.launch();
```

## Create action

```typescript
const getUserNameAction = new Action<MyContext>();
```

**You can also specify the type `state` and `payload`**

```typescript
type User = {
  name: string;
};

type GetUserNameActionPayload = {
  update: boolean;
};

const getUserNameAction = new Action<
  MyContext,
  User,
  GetUserNameActionPayload
>();
```

## Action API

`send(ctx, payload?)` - Called immediately after calling the `enter` function

`filter(ctx)` - Called after the user's response, the function should return `true` to continue execution and end the action

`result(ctx)` - Called immediately after the `filter` function ends, created to separate validation logic from database writing or any other business logic

```typescript
getUserNameAction.send((ctx, payload) => {
  if (payload.update) {
    return ctx.reply("Your new nickname ?");
  }

  ctx.reply("What's your name?");
});

getUserNameAction.filter((ctx) => {
  if (!ctx.message.text) {
    ctx.reply("Enter text");
    return false;
  }

  if (ctx.message.text.length < 2 && ctx.message.text.length > 50) {
    ctx.reply("Nickname must be between 2 and 50 characters");
    return false;
  }

  return true;
});

getUserNameAction.result((ctx) => {
  ctx.action.state.user.name = ctx.message.text;
  // OR SAVE DB
});
```

**You can omit creating `filter` and `result` functions as they are optional**

## Connect action to actionMachine

```typescript
actionMachine.connect("getUserName", getUserNameAction);
```

## Enter the action

```typescript
ctx.action.enter("getUserName");
```

**You can also specify an optional `payload` parameter**

```typescript
ctx.action.enter<GetUserNameActionPayload>("getUserName", { update: true });
```

## Example

#### Update MyContext

```typescript
interface SessionData extends WizardSessionData {
  user: UserEntity;
}

interface Session extends Scenes.WizardSession<SessionData> {}

interface MyContext extends Context {
  session: Session;
  scene: Scenes.SceneContextScene<MyContext, SessionData>;
  wizard: Scenes.WizardContextWizard<MyContext>;
  message: Update.New & Update.NonChannel & Message.TextMessage;
  action: ActionMachineContext;
}
```

#### Create scene

```typescript
const createAccountScene = new Scenes.WizardScene<MyContext>(
  SceneTypes.CREATE_ACCOUNT,
  (ctx) => {
    ctx.action.state = {
      user: {
        ID: ctx.from?.id,
      },
    };

    ctx.action.enter(ActionTypes.GET_USER_NAME);
    ctx.action.enter(ActionTypes.GET_USER_GENDER);
    ctx.action.enter(ActionTypes.GET_USER_BIRTH_YEAR);
    ctx.action.enter(ActionTypes.GET_USER_LOCATION);

    ctx.wizard.next();
  },
  (ctx) => {
    const user = ctx.action.state.user;
    db.user.create(user);

    ctx.reply("Your account has been created successfully");
  }
);
```

You can call as many **actions** as you want at once, the actions will be executed sequentially, and after completing the entire action stack, the scene will return `ctx`
