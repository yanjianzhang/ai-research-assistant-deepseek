import React from "react"
import { marked } from "marked"
import { States } from "../../../models/utils/states"
import { CopyButton } from "../../components/buttons/CopyButton"
import { NoteButton } from "../../components/buttons/NoteButton"
import { AnnotateButton } from "../../components/buttons/AnnotateButton"
import * as Markdown from "./actions/Markdown"

function defaultCopy(input: any) {
  const textContent = "<pre>" + JSON.stringify(input, null, 2) + "</pre>"
  const htmlContent = marked(textContent)
  return new ztoolkit.Clipboard()
    .addText(textContent, "text/unicode")
    .addText(htmlContent, "text/html")
    .copy()
}

interface MessageControlProps {
  id: string
  copyId?: string
  setCopyId: (id?: string) => void
  content: unknown
  states?: States
}

export function MessageControl({
  id,
  content,
  copyId,
  setCopyId,
  states,
}: MessageControlProps) {
  const Widget = Markdown

  return (
    <>
      {Widget.buttonDefs.map(({ name, utils }, index) => {
        switch (name) {
          case "COPY": {
            return (
              <CopyButton
                key={index}
                copyId={copyId}
                setCopyId={setCopyId}
                id={id}
                name={name}
                utils={utils}
                input={content}
              />
            )
          }
          case "NOTE": {
            return (
              <NoteButton
                key={index}
                name={name}
                utils={utils}
                input={content}
                states={states}
              />
            )
          }
          case "ANNOTATION": {
            return (
              <AnnotateButton
                key={index}
                name={name}
                utils={utils}
                input={content}
                states={states}
              />
            )
          }
          default: {
            return null
          }
        }
      })}
    </>
  )
}
