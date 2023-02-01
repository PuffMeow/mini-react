## 构建一个自己的 Mini React 框架

- 第一步：createElement 函数
- 第二步：render 函数
- 第三步：Concurrent Mode
- 第四步：Fibers
- 第五步：Render 与 Commit 两大阶段（Phases）
- 第六步：调和算法 Reconciliation
- 第七步：函数组件 Function Components
- 第八步：Hooks

## 预备：创建环境

创建一个空目录，我们就叫 Charging

```js
npm init -y
```

然后修改 package.json ， pnpm install 一下，我们需要 react-scripts 里面的 babel 能力来让我们自己的 createElement 函数运行起来

```json
{
  "name": "Charging",
  "version": "0.0.1",
  "description": "Mini React",
  "keywords": [],
  "main": "src/index.js",
  "dependencies": {
    "react": "16.8.6",
    "react-dom": "16.8.6",
    "react-scripts": "3.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --env=jsdom",
    "eject": "react-scripts eject"
  },
  "browserslist": [">0.2%", "not dead", "not ie <= 11", "not op_mini all"]
}
```

public/index.html文件：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, shrink-to-fit=no"
    />
    <meta name="theme-color" content="#000000" />
    <title>React App</title>
    <script src="../index.js"></script>
  </head>

  <body>
    <noscript> You need to enable JavaScript to run this app. </noscript>
    <div id="root"></div>
  </body>
</html>
```

最后的目录树是这样的

```js
MiniReact
├── README.md
├── package.json
├── pnpm-lock.yaml
├── public
│   └── index.html
└── src
    └── index.js
```

## 第一步：createElement

实现我们的 createElement 函数，调用 React.render 时，实际会把 jsx 转换成 js 代码，然后构建成一个含有 type 和 props 的对象

```js
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById("root");
ReactDOM.render(element, container);
```

从 jsx 转换到 js

```js
// 第一层，type 为 div，props 为 { id: "foo" }
const element = React.createElement(
  "div",
  { id: "foo" },
  React.createElement("a", null, "bar"),
  React.createElement("b")
);
```

接下来是处理 children，children 是嵌套结构，要保证其为数组

```js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children,
    },
  };
}
```

举例：

`createElement("div");`

返回

```json
{
  "type": "div",
  "props": { "children": [] }
}
```

`createElement("div", null, a, b)`

返回

```json
{
  "type": "div",
  "props": { "children": [a, b] }
}
```

children 数组也可以包含字符串和数字这样的原始类型。所以我们为所有不是对象的内容创建一个独立的元素，其创建一个特殊的 `TEXT_ELEMENT` 类型 。

```js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}
```

目前我们在使用 React 的 createElement 函数。我们现在就给自己的库起个名字，表示要去学习，所以就起名为 Charging （充电)。

```js
const Charging = {
  createElement,
};

const element = Charging.createElement(
  "div",
  { id: "foo" },
  Charging.createElement("a", null, "bar"),
  Charging.createElement("b")
);
```

我们想要把 jsx 转换成 js，就需要用到 babel 的能力，为了告诉 babel 我们要转换成自己定义的功能，就需要加这个注释

```js
/** @jsx Charging.createElement */
const element = (
  <div id="foo">
    <a>Hello World</a>
    <b />
  </div>
```

## 第二步：render

编写自己的 `Charging.render` 函数

首先使用 element type 创建 DOM 节点，然后将新节点附加到 container 中，然后递归为每个 children type 做一样的事情，如果处理文本元素 `TEXT_ELEMENT` ，将创建一个文本节点，最后是将 `element props` 分配给 DOM node:

```js
function render(element, container) {
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  element.props.children.forEach((child) => render(child, dom));

  // 判断 props 的值是属性，而不是一个 children
  const isProperty = (key) => key !== children;

  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name];
    });

  container.appendChild(dom);
}

const Charging = {
  createElement,
  render,
};
```

最后，我们就能在浏览器上看到 我们打印的 Hello World 了
完整代码：

```js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function render(element, container) {
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  element.props.children.forEach((child) => render(child, dom));

  // 判断 props 的值是属性，而不是一个 children
  const isProperty = (key) => key !== "children";

  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name];
    });

  container.appendChild(dom);
}

const Charging = {
  createElement,
  render,
};

/** @jsx Charging.createElement */
const element = (
  <div id="foo">
    <a>Hello world</a>
    <b />
  </div>
);

const container = document.getElementById("root");
Charging.render(element, container);
```

## 第三步：重构递归为 Concurrent Mode

上面的代码里有一个递归渲染的过程

```js
element.props.children.forEach((child) => render(child, dom));
```

一旦开始渲染，在整棵 element 树渲染完成之前程序是不会停止的。如果这棵 element 树过于庞大，它有可能会阻塞主进程太长时间。如果浏览器需要做类似于用户输入或者保持动画流畅这样的高优先级任务，则必须等到渲染完成为止。

我们将渲染工作分成几个小部分，在完成每个部分后，如果需要执行其他操作，我们将让浏览器中断渲染，这时候就需要 `requestIdleCallback` 这个 API，虽然 React 用的是自己实现的 Scheduler，但是它们的概念是相似的。这个 API 可以在主线程空闲的时候触发回调，`requestIdleCallback` 还为我们提供了 deadline 参数。我们可以用它来检查在浏览器需要再次控制之前我们有多少时间

```js
function render(element, container) {
  ...
  
  // 递归的方式无法进行中断
  // element.props.children.forEach((child) => render(child, dom));

  function workLoop(deadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
      shouldYield = deadline.timeRemaining() < 1;
    }

    requestIdleCallback(workLoop);
  }

  requestIdleCallback(workLoop);

  function performUnitOfWork(nextUnitOfWork) {
    // TODO
  }
}
```

`performUnitOfWork` 函数会执行工作单元，还会返回下一个工作单元

## 第四步：Fiber 结构

我们将为每一个 element 分配一个 fiber，每个 fiber 将成为一个工作单元。

在 `render` 函数中我们将会创建 root fiber，将其设置为 `nextUnitOfWork`。剩下的工作将在 `performUnitOfWork` 中进行，在那里我们将为每个 fiber 做三件事：

- 将 element 添加至 DOM
- 为 element 的 children 创建 fiber
- 选出下一个工作单元

![fiber](https://cdn.jsdelivr.net/gh/PuffMeow/PictureSave/doc/fiber.png)




设计这个数据结构的目标之一是使查找下一个工作单元变得更加容易，这就是为什么**每一个 Fiber 都会链接到其第一个子节点，下一个兄弟姐妹节点和其父节点。（在下文，用**`child`、`sibling`和`parent` 分别指代子节点、兄弟姐妹节点和父节点**）**

当我们完成对 Fiber 的工作时，如果它有 `child` ，那么这个 Fiber 会被当作是下一个工作单元

如果该 fiber 没有 `child` ，我们会把这个 fiber 的兄弟姐妹节点当作是下一个工作单元。

如果该 fiber 既没有 `child` 也没有 `sibling` ，那我们会寻找它的「叔叔节点」：其`parent`的 `sibling`

如果`parent`没有`sibling` ，我们将不断检查父节点的父节点，直到找到有`sibling` 的`parent`节点，或者直接找到根节点 `root` 位置。如果达到根节点，则意味着我们以及完成了此次渲染的所有工作
