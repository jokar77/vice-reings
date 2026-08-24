import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Path, Circle, Defs, Pattern, Line } from 'react-native-svg';
import { hashSeed, createRng } from '../utils/prng';

export const SKIN_PALETTE = [
  '#FAD6B1',
  '#D89C71',
  '#A66A45',
  '#704223',
  '#4A2814',
  '#FFDAB9',
];

export const TINT_PALETTE = [
  '#00F0FF',
  '#FF0055',
  '#FEE715',
  '#00FF88',
  '#9955FF',
  '#FF6600',
];

export interface PortraitSvgProps {
  seed?: string | null;
  width?: number | string;
  height?: number | string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface ProceduralFeatures {
  seedNum: number;
  tint: string;
  skin: string;
  collarTint: string;
  hairTint: string;
  glassesTint: string;
  hairIndex: number;
  glassesIndex: number;
  accIndex: number;
}

export const getProceduralFeatures = (rawSeed?: string | null): ProceduralFeatures => {
  const safeSeed = rawSeed && rawSeed.trim().length > 0 ? rawSeed.trim() : 'vice-shores-default';
  const seedNum = hashSeed(safeSeed);
  const rng = createRng(seedNum);
  const pick = (n: number) => Math.floor(rng() * n);

  const tint = TINT_PALETTE[pick(TINT_PALETTE.length)];
  const skin = SKIN_PALETTE[pick(SKIN_PALETTE.length)];
  const collarTint = TINT_PALETTE[pick(TINT_PALETTE.length)];
  const hairTint = TINT_PALETTE[pick(TINT_PALETTE.length)];
  const glassesTint = TINT_PALETTE[pick(TINT_PALETTE.length)];

  const hairIndex = pick(4);
  const glassesIndex = pick(3);
  const accIndex = pick(4);

  return {
    seedNum,
    tint,
    skin,
    collarTint,
    hairTint,
    glassesTint,
    hairIndex,
    glassesIndex,
    accIndex,
  };
};

export const PortraitSvg: React.FC<PortraitSvgProps> = ({
  seed,
  width = 300,
  height = 225,
  style,
  testID = 'portrait-svg',
}) => {
  const features = useMemo(() => getProceduralFeatures(seed), [seed]);
  const {
    seedNum,
    tint,
    skin,
    collarTint,
    hairTint,
    glassesTint,
    hairIndex,
    glassesIndex,
    accIndex,
  } = features;

  const patternId = `ht_${seedNum}`;

  return (
    <Svg
      testID={testID}
      viewBox="0 0 100 75"
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid slice"
      style={style}
    >
      <Defs>
        <Pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse">
          <Line x1="0" y1="0" x2="4" y2="4" stroke="#00F0FF" strokeWidth="0.5" opacity="0.1" />
        </Pattern>
      </Defs>

      {/* Tint background */}
      <Rect testID="portrait-bg-tint" width="100" height="75" fill={tint} opacity="0.2" />

      {/* Shoulders */}
      <Path
        testID="portrait-shoulders"
        d="M15 75 Q20 55 50 55 Q80 55 85 75 Z"
        fill="#1F0D3D"
      />

      {/* Collar */}
      <Path
        testID="portrait-collar"
        d="M 30 75 L 40 55 L 60 55 L 70 75 Z"
        fill={collarTint}
        opacity="0.8"
      />

      {/* Face */}
      <Path
        testID="portrait-face"
        d="M28 35 Q28 60 50 60 Q72 60 72 35 Q72 15 50 15 Q28 15 28 35 Z"
        fill={skin}
      />

      {/* Hair (4 variants) */}
      {hairIndex === 0 && (
        <Path
          testID="portrait-hair-0"
          d="M20 40 Q25 10 50 15 Q75 10 80 40 L70 25 Q50 15 30 25 Z"
          fill={hairTint}
        />
      )}
      {hairIndex === 1 && (
        <Path
          testID="portrait-hair-1"
          d="M25 50 Q20 15 50 20 Q80 15 75 50 L80 60 Q50 20 20 60 Z"
          fill="#1F0D3D"
        />
      )}
      {hairIndex === 2 && (
        <Rect
          testID="portrait-hair-2"
          x="25"
          y="15"
          width="50"
          height="20"
          rx="10"
          fill="#0A0A1A"
        />
      )}
      {hairIndex === 3 && (
        <Path
          testID="portrait-hair-3"
          d="M 20 30 Q 50 0 80 30 L 75 35 Q 50 15 25 35 Z"
          fill={hairTint}
        />
      )}

      {/* Glasses (3 variants) */}
      {glassesIndex === 1 && (
        <>
          <Path
            testID="portrait-glasses-1"
            d="M 30 35 L 70 35 L 72 42 L 28 42 Z"
            fill="#0A0A1A"
            opacity="0.8"
          />
          <Path d="M 32 35 L 48 35 L 48 40 L 32 40 Z" fill={glassesTint} opacity="0.5" />
          <Path d="M 52 35 L 68 35 L 68 40 L 52 40 Z" fill={glassesTint} opacity="0.5" />
        </>
      )}
      {glassesIndex === 2 && (
        <>
          <Rect
            testID="portrait-glasses-2"
            x="25"
            y="36"
            width="50"
            height="8"
            rx="2"
            fill="#0A0A1A"
          />
          <Rect x="28" y="37" width="20" height="6" fill={tint} />
          <Rect x="52" y="37" width="20" height="6" fill={tint} />
        </>
      )}

      {/* Mouth */}
      <Path
        testID="portrait-mouth"
        d="M42 52 Q50 55 58 52"
        fill="none"
        stroke="#0A0A1A"
        strokeWidth="1.5"
      />

      {/* Accessories (4 variants) */}
      {accIndex === 1 && (
        <Circle testID="portrait-acc-1" cx="35" cy="55" r="2" fill="#FEE715" />
      )}
      {accIndex === 2 && (
        <Path
          testID="portrait-acc-2"
          d="M40 65 L60 65 L50 75 Z"
          fill="#FEE715"
        />
      )}
      {accIndex === 3 && (
        <Rect
          testID="portrait-acc-3"
          x="45"
          y="60"
          width="10"
          height="3"
          fill="#00F0FF"
        />
      )}

      {/* Scanline halftone overlay */}
      <Rect
        testID="portrait-scanline-overlay"
        width="100"
        height="75"
        fill={`url(#${patternId})`}
      />
    </Svg>
  );
};

export const ProceduralPortrait = PortraitSvg;
export default PortraitSvg;
