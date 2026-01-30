import { Component } from "preact";
import { observer } from "mobx-react";

import * as s from "./ThemeToggle.css";
import Button from "./Button";
import Icon from "./Icon";
import { store } from "../store";

class ThemeToggle extends Component {
  render() {
    const { darkMode } = store;

    return (
      <Button
        type="button"
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={s.themeToggle}
        onClick={this.handleToggle}
      >
        <Icon name={darkMode ? "sun" : "moon"} size={16} />
      </Button>
    );
  }

  handleToggle = () => {
    store.toggleDarkMode();
  };
}

export default observer(ThemeToggle);
