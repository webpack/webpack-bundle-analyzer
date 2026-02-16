import { observer } from "mobx-react";
import { Component } from "preact";

import { store } from "../store.js";
import Button from "./Button.jsx";
import Icon from "./Icon.jsx";

import * as styles from "./ThemeToggle.css";

class ThemeToggle extends Component {
  render() {
    const { darkMode } = store;

    return (
      <Button
        type="button"
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={styles.themeToggle}
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
