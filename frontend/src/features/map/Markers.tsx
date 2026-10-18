import styled, { css, keyframes } from "styled-components";
import { Icon } from "../../components/Icon.tsx";
import { StatusDot } from "../../components/StatusDot.tsx";

// Map pins: white "+" circles with a status dot for facilities, a building badge for the pharmacy.

const Anchor = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
`;

const Circle = styled.div<{ $halo?: boolean; $dim?: boolean }>`
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme }) => theme.palette.surface};
  color: ${({ theme }) => theme.palette.primary};
  box-shadow: ${({ theme }) => theme.border.shadow.marker};
  opacity: ${({ $dim }) => ($dim ? 0.55 : 1)};
  ${({ $halo, theme }) => $halo && css`
    outline: 10px solid ${theme.palette.primarySoft};
    box-shadow: 0 0 0 22px ${theme.palette.primaryTint}, ${theme.border.shadow.marker};
  `}
`;

const Dot = styled.span`
  position: absolute;
  top: 1px;
  right: 1px;
  display: flex;
  padding: 2px;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme }) => theme.palette.surface};
`;

const Label = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: ${({ theme }) => theme.sizes.space.md};
  text-align: center;
  white-space: nowrap;
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textPrimary};
  text-shadow: 0 0 4px ${({ theme }) => theme.palette.mapLand};
`;

const Hood = styled.div`
  font-size: ${({ theme }) => theme.fonts.size.xxs};
  letter-spacing: ${({ theme }) => theme.fonts.tracking.overline};
  text-transform: uppercase;
  color: ${({ theme }) => theme.palette.textMuted};
`;

export function FacilityMarker({ name, neighborhood, status, halo, dim, onClick }: {
  name: string;
  neighborhood: string;
  status: Parameters<typeof StatusDot>[0]["$status"] | null;
  halo?: boolean;
  dim?: boolean;
  onClick?: () => void;
}) {
  return (
    <Anchor onClick={onClick} title={name}>
      <Circle $halo={halo} $dim={dim}>
        <Icon name="plus" size="md" />
        {status && <Dot><StatusDot $status={status} $size={8} /></Dot>}
      </Circle>
      <Label>
        {name}
        <Hood>{neighborhood}</Hood>
      </Label>
    </Anchor>
  );
}

const Badge = styled.div`
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme }) => theme.palette.surface};
  border: ${({ theme }) => theme.border.stroke.medium} solid ${({ theme }) => theme.palette.borderStrong};
  box-shadow: 0 0 0 8px ${({ theme }) => theme.palette.panel}, ${({ theme }) => theme.border.shadow.marker};
  color: ${({ theme }) => theme.palette.onPrimarySoft};
`;

export function PharmacyMarker({ name }: { name: string }) {
  return (
    <Anchor title={name}>
      <Badge><Icon name="building" size="lg" /></Badge>
      <Label>{name}</Label>
    </Anchor>
  );
}

const Van = styled.div<{ $delivered: boolean }>`
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme, $delivered }) => ($delivered ? theme.palette.statusConfirmed : theme.palette.primary)};
  color: ${({ theme }) => theme.palette.surface};
  border: ${({ theme }) => theme.border.stroke.thick} solid ${({ theme }) => theme.palette.surface};
  box-shadow: ${({ theme }) => theme.border.shadow.marker};
  ${({ $delivered, theme }) => !$delivered && css`
    &::after {
      content: "";
      position: absolute;
      inset: -6px;
      border-radius: ${theme.border.radius.pill};
      border: ${theme.border.stroke.medium} solid ${theme.palette.primary};
      animation: ${courierPing} 1.6s ease-out infinite;
    }
  `}
`;

const courierPing = keyframes`
  0% { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
`;

const VanLabel = styled(Label)`
  margin-top: ${({ theme }) => theme.sizes.space.sm};
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
`;

/** Simulated refrigerated courier moving along the approved route. */
export function CourierMarker({ etaMinutes, delivered }: { etaMinutes: number; delivered: boolean }) {
  return (
    <Anchor title="Simulated cold-chain courier">
      <Van $delivered={delivered}><Icon name={delivered ? "check" : "van"} size="md" /></Van>
      <VanLabel>
        {delivered ? "Delivered" : `Courier · ${etaMinutes} min`}
        <Hood>2–8 °C · simulated</Hood>
      </VanLabel>
    </Anchor>
  );
}
