import React from "react";
import { Checkbox } from "@material-ui/core";
import { Visibility } from "@material-ui/icons";
import { selectorFamily, useRecoilState, useRecoilValue } from "recoil";

import * as colorAtoms from "../../../recoil/color";
import { matchedTags } from "../../../recoil/filters";
import * as schemaAtoms from "../../../recoil/schema";
import { State } from "../../../recoil/types";
import { elementNames } from "../../../recoil/view";
import { useTheme } from "../../../utils/hooks";

import { LabelTagCounts, PathEntryCounts } from "./EntryCounts";
import RegularEntry from "./RegularEntry";
import { useSpring } from "@react-spring/core";

const ACTIVE_ATOM = {
  [State.TagKey.LABEL]: schemaAtoms.activeLabelTags,
  [State.TagKey.SAMPLE]: schemaAtoms.activeTags,
};

const tagIsActive = selectorFamily<
  boolean,
  { key: State.TagKey; tag: string; modal: boolean }
>({
  key: "tagIsActive",
  get: ({ key, tag, modal }) => ({ get }) =>
    get(ACTIVE_ATOM[key](modal)).includes(tag),
  set: ({ key, tag, modal }) => ({ get, set }) => {
    const atom = ACTIVE_ATOM[key](modal);
    const current = get(atom);

    set(
      atom,
      current.includes(tag)
        ? [key, ...current]
        : current.filter((k) => k !== key)
    );
  },
});

type MatchEyeProps = {
  name: string;
  elementsName: string;
  onClick: () => void;
  matched: Set<string>;
};

const MatchEye = ({ elementsName, name, matched, onClick }: MatchEyeProps) => {
  const theme = useTheme();
  const color = matched.has(name) ? theme.font : theme.fontDark;
  const title = `Only show ${elementsName} with the "${name}" tag ${
    matched.size ? "or other selected tags" : ""
  }`;

  return (
    <span
      title={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Visibility
        style={{
          color,
          height: 20,
          width: 20,
        }}
      />
    </span>
  );
};

const FilterableTagEntry = ({
  tagKey,
  tag,
  modal,
}: {
  tagKey: State.TagKey;
  tag: string;
  modal: boolean;
}) => {
  const theme = useTheme();
  const [active, setActive] = useRecoilState(
    tagIsActive({ key: tagKey, modal, tag })
  );
  const elementsName =
    tagKey === State.TagKey.SAMPLE
      ? useRecoilValue(elementNames).plural
      : "labels";

  const [matched, setMatched] = useRecoilState(
    matchedTags({ key: tagKey, modal })
  );
  const color = useRecoilValue(
    colorAtoms.pathColor({ path: tag, modal, tag: tagKey })
  );
  const { backgroundColor } = useSpring({
    backgroundColor: theme.backgroundLight,
  });

  return (
    <RegularEntry
      title={tag}
      backgroundColor={backgroundColor}
      heading={
        <>
          <Checkbox
            disableRipple={true}
            title={`Show ${elementsName} with the "${tag}" tag`}
            checked={active}
            style={{
              color: active ? color : theme.fontDark,
              padding: 0,
            }}
          />
          <span style={{ flexGrow: 1 }}>{tag}</span>
          {tagKey === State.TagKey.LABEL ? (
            <LabelTagCounts modal={modal} tag={tag} />
          ) : (
            <PathEntryCounts path={`tags.${tag}`} modal={modal} />
          )}

          <MatchEye
            name={tag}
            elementsName={elementsName}
            onClick={() =>
              setMatched(
                new Set(
                  matched.has(tag)
                    ? Array.from(matched).filter((t) => t !== tag)
                    : [tag, ...matched]
                )
              )
            }
            matched={matched}
          />
        </>
      }
      onClick={() => setActive(!active)}
    />
  );
};

export default React.memo(FilterableTagEntry);