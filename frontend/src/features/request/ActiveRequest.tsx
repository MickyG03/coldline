import styled from "styled-components";
import { Button } from "../../components/Button.tsx";
import { Chip } from "../../components/Chip.tsx";
import { Icon } from "../../components/Icon.tsx";
import { Mono, Overline } from "../../components/Text.tsx";
import type { Incident } from "../../connection/index.ts";

const Section = styled.div`
  padding: ${({ theme }) => theme.sizes.space.xl};
  background: ${({ theme }) => theme.palette.panel};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Head = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.sizes.space.lg};
  margin: ${({ theme }) => `${theme.sizes.space.xl} 0 ${theme.sizes.space.md}`};
`;

const IconBox = styled.div`
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.border.radius.lg};
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  background: ${({ theme }) => theme.palette.surface};
  color: ${({ theme }) => theme.palette.textSecondary};
`;

const Headline = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.fonts.size.xxl};
  font-weight: ${({ theme }) => theme.fonts.weight.regular};
  line-height: ${({ theme }) => theme.fonts.lineHeight.tight};
  letter-spacing: ${({ theme }) => theme.fonts.tracking.tight};
`;

const Sub = styled.div`
  font-size: ${({ theme }) => theme.fonts.size.sm};
  color: ${({ theme }) => theme.palette.textSecondary};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.sizes.space.sm};
  margin: ${({ theme }) => `${theme.sizes.space.md} 0 ${theme.sizes.space.xl}`};
`;

const Steps = styled.ol`
  position: relative;
  display: flex;
  justify-content: space-between;
  margin: 0;
  padding: 0;
  list-style: none;
  &::before {
    content: "";
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    border-top: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.borderStrong};
  }
`;

const Step = styled.li<{ $state: "done" | "current" | "todo" }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.sm};
  font-size: ${({ theme }) => theme.fonts.size.xxs};
  color: ${({ theme, $state }) => ($state === "todo" ? theme.palette.textMuted : theme.palette.textSecondary)};
  &:first-child { align-items: flex-start; }
  &:last-child { align-items: flex-end; }
  &::before {
    content: "";
    width: 9px;
    height: 9px;
    border-radius: ${({ theme }) => theme.border.radius.pill};
    background: ${({ theme, $state }) => ($state === "done" ? theme.palette.primary : theme.palette.panel)};
    border: ${({ theme }) => theme.border.stroke.medium} solid
      ${({ theme, $state }) => ($state === "todo" ? theme.palette.borderStrong : theme.palette.primary)};
  }
`;

const Empty = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.sizes.space.lg};
  margin-top: ${({ theme }) => theme.sizes.space.xl};
`;

const STORAGE = {
  refrigerated: "2–8 °C",
  frozen: "−50 to −15 °C",
  ultra_cold: "−90 to −60 °C",
} as const;

export function ActiveRequest({ incident, onNewRequest, busy }: {
  incident: Incident | null;
  onNewRequest: () => void;
  busy: boolean;
}) {
  if (!incident) {
    return (
      <Section>
        <Overline>Active request</Overline>
        <Empty>
          <Headline>All quiet on the network.</Headline>
          <Sub>No cold-storage request is open. Start one the way a pharmacy would.</Sub>
          <div>
            <Button $variant="soft" $size="sm" onClick={onNewRequest} disabled={busy}>
              <Icon name="plus" size="sm" /> New request
            </Button>
          </div>
        </Empty>
      </Section>
    );
  }
  const decided = incident.status === "approved" || incident.status === "closed";
  const matching = incident.facilities.length > 0;
  const step = (i: number) => (i === 0 || (i === 1 && decided) || (i === 2 && decided)
    ? "done"
    : (i === 1 && matching) ? "current" : "todo");
  return (
    <Section>
      <Row>
        <Overline>Active request</Overline>
        <Mono>{incident.code}</Mono>
      </Row>
      <Head>
        <IconBox><Icon name="box" size="md" /></IconBox>
        <Headline>A new home for {incident.totalUnits} doses.</Headline>
      </Head>
      <Sub>{incident.pharmacy.name}</Sub>
      <Chips>
        <Chip><Icon name="snowflake" size="sm" /> {STORAGE[incident.storageType]}</Chip>
        <Chip><Icon name="clock" size="sm" /> Equipment interruption</Chip>
        <Chip>Urgency {incident.urgency}</Chip>
        {incident.currentTempC != null && <Chip>{incident.currentTempC} °C now</Chip>}
      </Chips>
      <Steps>
        <Step $state={step(0)}>Request created</Step>
        <Step $state={step(1)}>Find a match</Step>
        <Step $state={step(2)}>Handoff</Step>
      </Steps>
    </Section>
  );
}
