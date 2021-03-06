import $ from "jquery";
import { toast } from "react-toastify";
import React, { Component } from "react";
import Showdown from "showdown";
import TurndownService from "turndown";
import MediumEditor from "medium-editor";

import * as api from "../../api";
import { getJwtToken } from "../../util";

import "./add-hr-plugin";
import "./embeds-patched-plugin";

class TurndownServiceProxy extends TurndownService {
  constructor(...args) {
    super(...args);
    this.keep("u");
  }

  turndown(html) {
    var content = $("<div>" + html + "</div>");
    content.find(".medium-insert-buttons").remove();

    var cleanedHtml = content.html();
    var mediumEmbedHtmls = {};

    content
      .find(".medium-insert-embeds,.medium-insert-images")
      .toArray()
      .forEach((el, i) => {
        var key = "MEDIUM-EMBED-" + i;
        mediumEmbedHtmls[key] = el.outerHTML;
        cleanedHtml = cleanedHtml.replace(el.outerHTML, key);
      });

    var markdown = super.turndown(cleanedHtml);

    for (let key in mediumEmbedHtmls) {
      markdown = markdown.replace(key, mediumEmbedHtmls[key]);
    }

    return markdown;
  }

  escape(html) {
    // override escape function with a noop
    return html;
  }
}

const converter = new Showdown.Converter();

class ContentEditor extends Component {
  constructor(props) {
    super(props);
    this.container = React.createRef();
  }

  componentDidMount() {
    this.editor = new MediumEditor(this.container.current, {
      toolbar: {
        buttons: [
          "bold",
          "italic",
          "underline",
          {
            name: "anchor",
            action: "createLink",
            aria: "link",
            tagNames: ["a"],
            contentDefault: '<i class="fa fa-link"></i>',
          },
          "h2",
          "h3",
          "quote",
        ],
      },
    });
    if (this.props.contentType === "html") {
      this.container.current.innerHTML = this.props.value;
    } else {
      this.container.current.innerHTML = converter.makeHtml(this.props.value);
    }

    this._convertImagesToEmbeds(this.container.current);

    const turndown = new TurndownServiceProxy();
    this.editor.subscribe("editableInput", (event, editable) => {
      if (this.props.contentType === "html") {
        this.props.onChange(editable.innerHTML);
      } else {
        this.props.onChange(turndown.turndown(editable.innerHTML));
      }
    });

    let uploadImageUrl = api.uploadImageUrl();
    if (this.props.blogpostId) {
      uploadImageUrl += "?post_id=" + this.props.blogpostId;
    }

    $(this.container.current).mediumInsert({
      editor: this.editor,
      addons: {
        images: {
          deleteScript: false,
          fileUploadOptions: {
            url: uploadImageUrl,
            headers: {
              Authorization: "Bearer " + getJwtToken(),
            },
            fail: (ev, data) => {
              const responseJSON = data.response().jqXHR.responseJSON;
              toast.error(responseJSON.error);

              // Remove image previews
              $(this.container.current)
                .find(".medium-insert-images")
                .each(function() {
                  const img = $(this).find("img");
                  if (img.length && img.attr("src").startsWith("blob:")) {
                    setTimeout(() => $(this).remove(), 500);
                  }
                });
            },
          },
          captions: false,
          preview: true,
        },
        embeds: false,
        embedsPatched: {
          styles: false,
          captions: false,
          oembedProxy: false,
        },
        addHr: {
          test: true,
        },
      },
    });
    $(this.container.current).removeClass("medium-editor-placeholder");
    $(this.container.current).html($(this.container.current).html());
    $(this.container.current).on("keyup", e => {
      // space or enter
      if (e.keyCode !== 13 && e.keyCode !== 32) {
        return;
      }
      $(this.container.current).linkify();
    });
  }

  componentWillUnmount() {
    this.editor.destroy();
  }

  render() {
    return <div style={{ minHeight: "300px" }} ref={this.container} />;
  }

  _convertImagesToEmbeds(el) {
    $(el)
      .find("img")
      .each(function() {
        var found = $(this).closest(".medium-insert-embeds");
        if (found.length) {
          return;
        }

        $(this).replaceWith(
          $(`
        <div class="medium-insert-embeds" contenteditable="false">
          <figure>
            <div class="medium-insert-embed">
              ${$(this)[0].outerHTML}
            </div>
          </figure>
          <div class="medium-insert-embeds-overlay"></div>
        </div>
      `)
        );
      });
  }
}

export default ContentEditor;
