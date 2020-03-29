import logo from 'ic:canisters/logo';
import { IDL, UI, UICore } from 'ic:userlib';
import './logo.css';

function Candid() {
 const Exp = IDL.Rec()
 const List = IDL.Rec()
 const Statement = IDL.Rec()
 List.fill(IDL.Opt(IDL.Record({'Statement': Statement, 'More': List})))
 const Statements = List
 Exp.fill(
  IDL.Variant({'+': IDL.Record({'e1': Exp, 'e2': Exp}), 'Int': IDL.Int,
               'Var': IDL.Text}))
 Statement.fill(
  IDL.Variant({'repeat': IDL.Record({'N': IDL.Nat, 'Block': Statements}),
   'home': IDL.Null, 'left': IDL.Null, 'block': Statements, 'forward': Exp,
   'right': IDL.Null}))
 const Coord = IDL.Record({'x': IDL.Int, 'y': IDL.Int})
 const Object =
  IDL.Variant({'line': IDL.Record({'end': Coord, 'start': Coord})})
 return IDL.Func([Statement], [], []);
};

class ExpRender extends IDL.Visitor {
  visitType(t, d) {
    const input = document.createElement('input');
    input.classList.add('argument');
    input.placeholder = t.display();
    return inputBox(t, { input });
  }  
}

function renderInput(t) {
  return t.accept(new UI.Render(), null);
}

const N = 600;

async function renderCanvas(ctx, res) {
  const objects = res[0];
  const x = res[1].toNumber();
  const y = res[2].toNumber();
  const dir = res[3].toNumber();
  ctx.clearRect(0, 0, N, N);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  for (const obj of objects) {
    const start = obj.line.start;
    const end = obj.line.end;
    ctx.beginPath();  
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };
  
  ctx.strokeStyle = 'green';
  ctx.lineWidth = 4;
  ctx.translate(x,y);
  ctx.rotate(-dir*Math.PI/180);
  ctx.beginPath();
  ctx.moveTo(-10,-10);
  ctx.lineTo(0,0);
  ctx.lineTo(-10,10);
  ctx.stroke();
  ctx.rotate(dir*Math.PI/180);  
  ctx.translate(-x,-y);
}

async function parse(inputs, ctx, fake) {
  const args = inputs.map(arg => arg.parse());
  const isReject = inputs.some(arg => arg.isRejected());
  if (isReject) {
    return;
  }
  let res;
  if (fake) {
    res = await logo.fakeEval(...args);
  } else {
    await logo.eval(...args);
    res = await logo.output();
  }
  await renderCanvas(ctx, res);
}

function renderUI(func, dom, ctx) {
  const inputs = [];
  
  let container = document.createElement('div');
  func.argTypes.forEach(arg => {
    const input = renderInput(arg);
    inputs.push(input);
    input.render(container);
  });
  dom.appendChild(container);
  
  dom.appendChild(document.createElement('div'));
  const draw = document.createElement('button');  
  draw.innerText = 'Draw';
  dom.appendChild(draw);
  draw.addEventListener('click', () => {
    parse(inputs, ctx, false);
  });
  
  dom.appendChild(document.createElement('div'));
  const clear = document.createElement('button');
  clear.innerText = 'Clear';
  dom.appendChild(clear);
  clear.addEventListener('click', () => {
    (async () => {
      await logo.clear();
      const res = await logo.output();
      await renderCanvas(ctx, res);
    })();
  });

  // Customize UI
  UI.Render.prototype.visitType = (t,d) => {
    const input = document.createElement('input');
    input.classList.add('argument');
    input.placeholder = t.display();
    input.addEventListener('change', () => { parse(inputs, ctx, true); });
    return UI.inputBox(t, { input });
  };
  UI.Render.prototype.visitNull = (t,d) => {
    const input = UI.inputBox(t, {});
    // This is a hack to make sure async parse is run after return
    (async () => {
      await parse(inputs, ctx, true);
    })().catch(err => {
      console.log("retry");
      setTimeout(() => { parse(inputs, ctx, true) }, 200);
    });
    return input;
  };
}

async function init() {
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;

  const left = document.createElement('div');  
  const ctx = canvas.getContext('2d');
  const res = await logo.output();
  renderCanvas(ctx, res);
  left.appendChild(canvas);
  
  const right = document.createElement('div');
  const func = logo.__actorInterface()['eval'];  
  renderUI(func, right, ctx);

  const box = document.createElement('div');
  box.style.display = 'flex';
  box.appendChild(left);
  box.appendChild(right);
  document.body.appendChild(box);  
}

init();
