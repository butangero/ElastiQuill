import React, { Component } from "react";
import { inject, observer } from "mobx-react";

import LoggedInLayout from "../components/LoggedInLayout";

@inject("setupStore")
@observer
class Setup extends Component {
  componentDidMount() {
    this.props.setupStore.loadStatus();
  }

  render() {
    return (
      <LoggedInLayout pageTitle="Elasticsearch setup">
        <div className="elastiquill-content">
          <div className="row">
            <div className="col-12">{this._renderContent()}</div>
          </div>
        </div>
      </LoggedInLayout>
    );
  }

  _renderContent() {
    if (this.props.setupStore.isLoading) {
      return "Loading...";
    }

    if (this.props.setupStore.status === "ready") {
      return (
        <div className="alert alert-success">
          Elasticsearch setup is completed.
        </div>
      );
    }

    const isLoadingSetup =
      this.props.setupStore.beingLoaded.indexOf("setup") > -1;

    return (
      <div>
        <div
          onClick={() => this.props.setupStore.setupElasticsearch()}
          disabled={isLoadingSetup}
          className="btn btn-primary btn-lg"
        >
          {isLoadingSetup ? "Loading..." : "Complete setup"}
        </div>
      </div>
    );
  }
}

export default Setup;
