import { Fragment, useState } from "react";
import styled from "styled-components";
import { Icon } from "../../components/Icon.tsx";
import { StatusDot } from "../../components/StatusDot.tsx";
import { Mono, Muted, Overline, SectionTitle } from "../../components/Text.tsx";
import type { FacilityStatus, IncidentFacility } from "../../connection/index.ts";
import type { FacilityView } from "../filters.ts";
import { firstCondition, fmtMiles, fmtTime, pct, statusLine } from "../status.ts";

// "Within reach": facility rows with status line and distance; the selected row expands into
// the Jev evidence (labels + confidence) and the timestamped answers behind its status.

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.sizes.space.xl} ${theme.sizes.space.xl} ${theme.sizes.space.md}`};
`;

const Count = styled.sup`
  margin-left: ${({ theme }) => theme.sizes.space.sm};
  font-size: ${({ theme }) => theme.fonts.size.xxs};
  color: ${({ theme }) => theme.palette.textMuted};
`;

const Sort = styled.select`
  border: 0;
  background: transparent;
  font-size: ${({ theme }) => theme.fonts.size.xxs};
  color: ${({ theme }) => theme.palette.textMuted};
  cursor: pointer;
`;

const List = styled.ul`
  margin: 0;
  padding: ${({ theme }) => `0 ${theme.sizes.space.md} ${theme.sizes.space.md}`};
  list-style: none;
`;

const Item = styled.li<{ $selected: boolean }>`
  border: ${({ theme }) => theme.border.stroke.thin} solid
    ${({ theme, $selected }) => ($selected ? theme.palette.primarySoftHover : "transparent")};
  border-radius: ${({ theme }) => theme.border.radius.lg};
  background: ${({ theme, $selected }) => ($selected ? theme.palette.primaryTint : "transparent")};
  & + & { margin-top: ${({ theme }) => theme.sizes.space.xxs}; }
`;

const RowButton = styled.button`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: ${({ theme }) => theme.sizes.space.lg};
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.sizes.space.md};
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
`;

const Plus = styled.span`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  border-radius: ${({ theme }) => theme.border.radius.md};
  background: ${({ theme }) => theme.palette.surface};
  color: ${({ theme }) => theme.palette.primary};
`;

const Name = styled.div`
  font-size: ${({ theme }) => theme.fonts.size.sm};
  color: ${({ theme }) => theme.palette.textPrimary};
`;

const Line = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.sm};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textSecondary};
`;

const Right = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${({ theme }) => theme.sizes.space.xs};
  color: ${({ theme }) => theme.palette.primary};
`;

const Evidence = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.sizes.space.md};
  padding: ${({ theme }) => `0 ${theme.sizes.space.md} ${theme.sizes.space.md}`};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textSecondary};
`;

const Bars = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: ${({ theme }) => `${theme.sizes.space.xs} ${theme.sizes.space.sm}`};
  align-items: center;
`;

const Bar = styled.span<{ $v: number }>`
  height: 4px;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: linear-gradient(to right,
    ${({ theme }) => theme.palette.primary} ${({ $v }) => $v * 100}%,
    ${({ theme }) => theme.palette.border} ${({ $v }) => $v * 100}%);
`;

const AnswerBox = styled.div`
  padding: ${({ theme }) => theme.sizes.space.sm};
  border-left: ${({ theme }) => theme.border.stroke.thick} solid ${({ theme }) => theme.palette.primarySoftHover};
  background: ${({ theme }) => theme.palette.surface};
`;

const STATUS_ORDER: Record<FacilityStatus, number> = {
  confirmed: 0, conditional: 1, calling: 2, incomplete: 3, unknown: 4, contradictory: 5, unavailable: 6,
};

function EvidencePanel({ r }: { r: IncidentFacility }) {
  if (!r.labels.length && !r.answers.length) {
    return <Evidence><Muted>No answer yet. Drive {r.driveMinutes ?? "?"} min · receives {r.facility.receivingHours}.</Muted></Evidence>;
  }
  return (
    <Evidence>
      <Overline>Jev evidence{r.confidence != null ? ` · confidence ${pct(r.confidence)}` : ""}</Overline>
      <Bars>
        {r.labels.map((l) => (
          <Fragment key={l.label}>
            <Mono>{l.label}</Mono>
            <Bar $v={Math.max(0, Math.min(1, l.confidence))} />
            <Mono>{l.confidence.toFixed(2)}</Mono>
          </Fragment>
        ))}
      </Bars>
      {r.answers.map((a) => (
        <AnswerBox key={a.at}>
          <Mono>{fmtTime(a.at)} · {a.status}</Mono>
          <div>{a.text}</div>
          {firstCondition(a.conditions) && <Muted>Condition: {firstCondition(a.conditions)}</Muted>}
        </AnswerBox>
      ))}
    </Evidence>
  );
}

export function WithinReach({ views, selectedId, onSelect, hasIncident }: {
  views: FacilityView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasIncident: boolean;
}) {
  const [sort, setSort] = useState<"distance" | "status">("distance");
  const rows = [...views]
    .filter((v) => !hasIncident || v.response)
    .sort((a, b) => (sort === "status" && a.status && b.status
      ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      : 0) || a.km - b.km);
  return (
    <div>
      <Head>
        <SectionTitle>Within reach<Count>{rows.length}</Count></SectionTitle>
        <Sort value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
          <option value="distance">Nearest first</option>
          <option value="status">Best status first</option>
        </Sort>
      </Head>
      <List>
        {rows.map((v) => {
          const selected = v.facility.id === selectedId;
          return (
            <Item key={v.facility.id} $selected={selected}>
              <RowButton onClick={() => onSelect(v.facility.id)}>
                <Plus><Icon name="plus" size="md" /></Plus>
                <div>
                  <Name>{v.facility.name}</Name>
                  <Line>
                    <StatusDot $status={v.status ?? "unknown"} />
                    {v.response ? statusLine(v.response) : `${v.facility.capacity.refrigerated} refrigerated · ${v.facility.receivingHours}`}
                  </Line>
                </div>
                <Right>
                  <Mono>{fmtMiles(v.km)}</Mono>
                  {selected && <Icon name="check" size="sm" />}
                </Right>
              </RowButton>
              {selected && v.response && <EvidencePanel r={v.response} />}
            </Item>
          );
        })}
      </List>
    </div>
  );
}
