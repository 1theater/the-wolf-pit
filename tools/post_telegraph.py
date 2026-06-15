#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convert the play markdown to telegra.ph Node format and (optionally) publish."""
import json
import re
import sys
import urllib.parse
import urllib.request

SRC = r"C:\projects\theater\dogs\Волчья яма.md"

inline_re = re.compile(r"\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`")


def parse_inline(text):
    nodes = []
    pos = 0
    for m in inline_re.finditer(text):
        if m.start() > pos:
            nodes.append(text[pos:m.start()])
        if m.group(1) is not None:
            nodes.append({"tag": "strong", "children": [m.group(1)]})
        elif m.group(2) is not None:
            nodes.append({"tag": "em", "children": [m.group(2)]})
        else:
            nodes.append({"tag": "code", "children": [m.group(3)]})
        pos = m.end()
    if pos < len(text):
        nodes.append(text[pos:])
    return nodes or [text]


def md_to_nodes(md):
    blocks = []
    para, quote = [], []

    def join_lines(lines):
        children = []
        for i, ln in enumerate(lines):
            if i:
                children.append({"tag": "br"})
            children.extend(parse_inline(ln))
        return children

    def flush_para():
        if para:
            blocks.append({"tag": "p", "children": join_lines(para)})
            para.clear()

    def flush_quote():
        if quote:
            blocks.append({"tag": "blockquote", "children": join_lines(quote)})
            quote.clear()

    for raw in md.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush_para(); flush_quote(); continue
        if line.lstrip().startswith("#"):
            flush_para(); flush_quote()
            level = len(line) - len(line.lstrip("#"))
            text = line.lstrip("#").strip()
            tag = "h3" if level <= 1 else "h4"
            blocks.append({"tag": tag, "children": parse_inline(text)})
        elif set(line.strip()) <= {"-"} and len(line.strip()) >= 3:
            flush_para(); flush_quote()
            blocks.append({"tag": "hr"})
        elif line.lstrip().startswith(">"):
            flush_para()
            quote.append(line.lstrip()[1:].strip())
        else:
            flush_quote()
            para.append(line)
    flush_para(); flush_quote()
    return blocks


def api(method, **params):
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request("https://api.telegra.ph/" + method, data=data)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    with open(SRC, encoding="utf-8") as f:
        md = f.read()
    nodes = md_to_nodes(md)
    content = json.dumps(nodes, ensure_ascii=False)
    print("nodes:", len(nodes), "| content bytes:", len(content.encode("utf-8")))

    if "--post" not in sys.argv:
        print("dry run (pass --post to publish)")
        return

    acc = api("createAccount", short_name="teatr", author_name="Театр")
    token = acc["result"]["access_token"]
    res = api(
        "createPage",
        access_token=token,
        title="Волчья яма",
        author_name="Театр",
        content=content,
        return_content="false",
    )
    print(json.dumps({"access_token": token, "result": res}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
