"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class Win98ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[FishPosts BSOD]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bsod">
          <div className="bsod-content">
            <div className="bsod-header">FishPosts</div>
            <p>
              A fatal exception 0E has occurred at 0028:C0011E36 in VXD FISH(01) +
              00010E36. The current application will be terminated.
            </p>
            <p>
              *&nbsp;&nbsp;Press any key to restart FishPosts.<br />
              *&nbsp;&nbsp;Press CTRL+ALT+DEL to touch some grass.
            </p>
            <p className="bsod-error">
              {this.state.error?.message || "Unknown error"}
            </p>
            <button
              className="bsod-restart"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Press any key to continue _
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
