import styled, { css } from "styled-components";
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
