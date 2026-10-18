import styled from "styled-components";

export const Card = styled.section`
  background: ${({ theme }) => theme.palette.surface};
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  border-radius: ${({ theme }) => theme.border.radius.xxl};
  overflow: hidden;
`;

export const Hairline = styled.hr`
  margin: 0;
  border: 0;
  border-top: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;
