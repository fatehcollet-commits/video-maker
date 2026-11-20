export const LINE_IDS = [
  'L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09', 'L10',
  'L11', 'L12', 'L13', 'L14', 'L15', 'L16', 'L17', 'L18', 'L19', 'L20',
  'L21', 'L22', 'L23', 'L24', 'L25', 'L26',
] as const;

export type LineId = (typeof LINE_IDS)[number];

export interface ScriptLine {
  id: LineId;
  text: string;
}

export const LINES: Record<LineId, ScriptLine> = {
  L01: { id: 'L01', text: 'Rule four at Gate Seven is written in red.' },
  L02: { id: 'L02', text: 'Never open the door after midnight.' },
  L03: { id: 'L03', text: 'Even if they know your name.' },
  L04: { id: 'L04', text: 'At two forty-one, the sensor blinked.' },
  L05: { id: 'L05', text: 'Something pressed against the wired glass.' },
  L06: { id: 'L06', text: 'I aimed my flashlight through the scratches.' },
  L07: { id: 'L07', text: 'A girl in a lab coat stood outside.' },
  L08: { id: 'L08', text: 'She held up a bloodstained badge.' },
  L09: { id: 'L09', text: 'Level three clearance.' },
  L10: { id: 'L10', text: "Please, she whispered. They're behind me." },
  L11: { id: 'L11', text: 'I reached for the unlock switch.' },
  L12: { id: 'L12', text: 'Then I saw the thermal monitor.' },
  L13: { id: 'L13', text: 'Outside: two degrees Celsius.' },
  L14: { id: 'L14', text: 'I looked back at her mouth.' },
  L15: { id: 'L15', text: 'She was panting against the glass.' },
  L16: { id: 'L16', text: 'Wait.' },
  L17: { id: 'L17', text: 'There was no fog on the glass.' },
  L18: { id: 'L18', text: 'Not a single breath.' },
  L19: { id: 'L19', text: 'I pulled my hand away.' },
  L20: { id: 'L20', text: 'Her crying stopped.' },
  L21: { id: 'L21', text: 'Her head cracked sideways.' },
  L22: { id: 'L22', text: 'Her jaw dropped past human limits.' },
  L23: { id: 'L23', text: 'Behind her, twelve white eyes opened.' },
  L24: { id: 'L24', text: 'The red strobe flashed across my floor.' },
  L25: { id: 'L25', text: 'My lock was already cut from inside.' },
  L26: { id: 'L26', text: 'And the door behind me just clicked open.' },
};
