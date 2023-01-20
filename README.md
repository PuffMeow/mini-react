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

我们将渲染工作分成几个小部分，在完成每个部分后，如果需要执行其他操作，我们将让浏览器中断渲染，这时候就需要 requestIdleCallback 这个 API，虽然 React 用的是自己实现的 scheduler，但是它们的概念是相似的。它可以在主线程空闲的时候进行回调
