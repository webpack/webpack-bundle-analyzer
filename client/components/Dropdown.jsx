import { createRef } from "preact";
import PureComponent from "../lib/PureComponent";

import * as s from "./Dropdown.css";

export default class Dropdown extends PureComponent {
  input = createRef();

  state = {
    query: "",
    showOptions: false,
  };

  componentDidMount() {
    document.addEventListener("click", this.handleClickOutside, true);
  }

  componentWillUnmount() {
    document.removeEventListener("click", this.handleClickOutside, true);
  }

  render() {
    const { label, options } = this.props;

    const filteredOptions = this.state.query
      ? options.filter((option) =>
          option.toLowerCase().includes(this.state.query.toLowerCase()),
        )
      : options;

    return (
      <div className={s.container}>
        <div className={s.label}>{label}:</div>
        <div>
          <input
            ref={this.input}
            className={s.input}
            type="text"
            value={this.state.query}
            onInput={this.handleInput}
            onFocus={this.handleFocus}
          />
          {this.state.showOptions ? (
            <div>
              {filteredOptions.map((option) => (
                <div
                  key={option}
                  className={s.option}
                  onClick={this.getOptionClickHandler(option)}
                >
                  {option}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  handleClickOutside = (event) => {
    const el = this.input.current;
    if (el && event && !el.contains(event.target)) {
      this.setState({ showOptions: false });
      // If the query is not in the options, reset the selection
      if (
        this.state.query &&
        !this.props.options.some((option) => option === this.state.query)
      ) {
        this.setState({ query: "" });
        this.props.onSelectionChange(undefined);
      }
    }
  };

  handleInput = (event) => {
    const { value } = event.target;
    this.setState({ query: value });
    if (!value) {
      this.props.onSelectionChange(undefined);
    }
  };

  handleFocus = () => {
    // move the cursor to the end of the input
    this.input.current.value = this.state.query;
    this.setState({ showOptions: true });
  };

  getOptionClickHandler = (option) => () => {
    this.props.onSelectionChange(option);
    this.setState({ query: option, showOptions: false });
  };
}
