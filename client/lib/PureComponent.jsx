import { Component } from "preact";

function isEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  const keys = Object.keys(obj1);
  if (keys.length !== Object.keys(obj2).length) return false;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (obj1[key] !== obj2[key]) return false;
  }
  return true;
}

export default class PureComponent extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    return !isEqual(nextProps, this.props) || !isEqual(this.state, nextState);
  }
}
