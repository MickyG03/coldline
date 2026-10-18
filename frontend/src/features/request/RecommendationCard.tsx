import styled from "styled-components";
import { Button } from "../../components/Button.tsx";
import { Icon } from "../../components/Icon.tsx";
import { StatusDot } from "../../components/StatusDot.tsx";
import { Muted, Overline } from "../../components/Text.tsx";
import type { Incident } from "../../connection/index.ts";
import { fmtTime, STATUS_LABEL } from "../status.ts";

// Staff approval: the top-ranked confirmed/conditional site, with Approve / Reject.

const Box = styled.div`
  margin: ${({ theme }) => theme.sizes.space.lg};
  padding: ${({ theme }) => theme.sizes.space.lg};
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.primarySoftHover};
  border-radius: ${({ theme }) => theme.border.radius.xl};
  background: ${({ theme }) => theme.palette.primaryTint};
  scroll-margin-top: ${({ theme }) => theme.sizes.space.xl};
`;

const Name = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.sm};
  margin: ${({ theme }) => `${theme.sizes.space.sm} 0`};
  font-size: ${({ theme }) => theme.fonts.size.lg};
`;

const Summary = styled.p`
  margin: 0 0 ${({ theme }) => theme.sizes.space.lg};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  line-height: ${({ theme }) => theme.fonts.lineHeight.normal};
  color: ${({ theme }) => theme.palette.textSecondary};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.sizes.space.sm};
`;

const Decided = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.sizes.space.sm};
  align-items: flex-start;
  font-size: ${({ theme }) => theme.fonts.size.sm};
  color: ${({ theme }) => theme.palette.onPrimarySoft};
`;

export function RecommendationCard({ incident, busy, onDecide }: {
  incident: Incident;
  busy: string | null;
  onDecide: (action: "approve" | "reject", facilityId: string) => void;
}) {
  const approved = incident.decisions.find((d) => d.decision === "approved");
  if (approved) {
    return (
      <Box id="approve">
        <Overline>Handoff approved</Overline>
        <Decided>
          <Icon name="check" size="md" />
          <div>
            {approved.facility?.name ?? "Site"} approved by {approved.decidedBy}
            <br />
            <Muted>{fmtTime(approved.decidedAt)}{approved.reason ? ` · ${approved.reason}` : ""}</Muted>
          </div>
        </Decided>
      </Box>
    );
  }
  const rec = incident.recommendation;
  if (!rec) return null;
  return (
    <Box id="approve">
      <Overline>Recommendation · awaiting staff approval</Overline>
      <Name>
        <StatusDot $status={rec.status} $size={8} />
        {rec.facility.name}
        <Muted>{STATUS_LABEL[rec.status]}</Muted>
      </Name>
      <Summary>{rec.summary}</Summary>
      <Actions>
        <Button $variant="solid" $size="sm" disabled={!!busy} onClick={() => onDecide("approve", rec.facility.id)}>
          <Icon name="check" size="sm" /> {busy === "approve" ? "Approving…" : "Approve"}
        </Button>
        <Button $variant="danger" $size="sm" disabled={!!busy} onClick={() => onDecide("reject", rec.facility.id)}>
          <Icon name="close" size="sm" /> Reject
        </Button>
      </Actions>
    </Box>
  );
}
