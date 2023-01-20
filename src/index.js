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
