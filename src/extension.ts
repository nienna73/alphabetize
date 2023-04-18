// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { isContext } from "vm";
import * as vscode from "vscode";

interface IContent {
  sortKey: string;
  content: string;
}

function compareElements(a: IContent, b: IContent) {
  // TODO: sometimes the keys are set to a close brace instead of the
  // correct value. This is a workaround.
  if (a.sortKey.endsWith("}")) {
    a.sortKey = a.content.split("\n")[0];
  }
  if (b.sortKey.endsWith("}")) {
    b.sortKey = b.content.split("\n")[0];
  }
  if (a.sortKey > b.sortKey) {
    return 1;
  }
  if (a.sortKey < b.sortKey) {
    return -1;
  }
  return 0;
}

function sortInnerObject(lines: string[], i: number) {
  const line: string = lines[i];
  let innerRowsToSort: IContent[] = [];
  let innerContent: IContent = { sortKey: "", content: "" };
  let storedLine: string = "";
  i++;
  while (!lines[i].endsWith("}") && i < lines.length - 1) {
    if (
      lines[i].replace(/[ ]/g, "").startsWith("#") ||
      lines[i].replace(/[ ]/g, "").startsWith("//")
    ) {
      // is it a comment?
      storedLine = storedLine.concat(lines[i]);
    } else {
      let content = lines[i] + "\n";
      if (lines[i].endsWith("{")) {
        [innerContent, i] = sortInnerObject(lines, i);
        const innerContentContent: string = innerContent.content;
        content = content.concat(innerContentContent);
      }
      if (storedLine !== "") {
        content = storedLine + "\n" + content;
        storedLine = "";
      }
      const innerLine: IContent = {
        sortKey: lines[i],
        content: content,
      };
      innerRowsToSort.push(innerLine);
    }
    i++;
  }
  innerRowsToSort.sort(compareElements);
  let content: string = "";
  for (let row of innerRowsToSort) {
    content = content.concat(row.content);
  }
  content = content.concat(lines[i] + "\n");
  const elementToPush: IContent = {
    sortKey: line,
    content: content,
  };
  const returnObject: [IContent, number] = [elementToPush, i];
  return returnObject;
}

function removeBlankLines(s: string) {
  // TODO: somewhere in the process, we add an extra \n after a }
  // this is a workaround for that problem.
  let splitString: string[] = s.split("\n");
  let elementsToKeep: string[] = [];
  for (let row of splitString) {
    if (row) {
      elementsToKeep.push(row);
    }
  }
  return elementsToKeep.join("\n");
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "alphabetize.alphabetize",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        // access the current selection of text, if it exists
        if (selection) {
          const selectionRange = new vscode.Range(
            selection.start.line,
            0,
            selection.end.line,
            selection.end.character
          );
          let highlighted = editor.document.getText(selectionRange);
          const lines: string[] = highlighted.split("\n");
          let listOfElements = [];
          let storedLine = "";
          for (let i: number = 0; i < lines.length; i++) {
            const el = lines[i];
            if (!el) {
              // ignore blank lines
              continue;
            }
            // comment line
            if (el.startsWith("#") || el.startsWith("//")) {
              console.log(el);
              storedLine = storedLine.concat(el);
            } else if (el.endsWith("{")) {
              // nested object
              let innerContent;
              [innerContent, i] = sortInnerObject(lines, i);
              let contentToStore = el + "\n" + innerContent.content;
              if (storedLine !== "") {
                contentToStore = storedLine + "\n" + contentToStore;
                storedLine = "";
              }
              const elementToPush = {
                sortKey: el,
                content: contentToStore,
              };
              listOfElements.push(elementToPush);
            } else {
              if (storedLine !== "") {
                storedLine = storedLine.concat("\n" + el);
                const elementToPush = {
                  sortKey: el,
                  content: storedLine,
                };
                listOfElements.push(elementToPush);
                storedLine = "";
              } else {
                const elementToPush = {
                  sortKey: el,
                  content: el,
                };
                listOfElements.push(elementToPush);
              }
            }
          }

          // sort and redisplay
          listOfElements.sort(compareElements);
          let elementsToReturn: string[] = [];
          for (let el of listOfElements) {
            elementsToReturn.push(el["content"]);
          }
          const returnString = elementsToReturn.join("\n");
          const removedBlankLines = removeBlankLines(returnString);
          editor.edit((editBuilder) => {
            editBuilder.replace(selectionRange, removedBlankLines);
          });
        }
      } else {
        vscode.window.showInformationMessage("Nothing to alphabetize");
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
