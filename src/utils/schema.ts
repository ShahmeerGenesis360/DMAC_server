export class RoutePlanStep {
    swap: string; // Replace with enum if necessary
    percent: number;
    input_index: number;
    output_index: number;
  
    constructor(fields: { swap: string; percent: number; input_index: number; output_index: number }) {
      this.swap = fields.swap;
      this.percent = fields.percent;
      this.input_index = fields.input_index;
      this.output_index = fields.output_index;
    }
  }
  
export class SharedAccountsRouteArgs {
    id: number;
    route_plan: RoutePlanStep[];
    in_amount: bigint;
    quoted_out_amount: bigint;
    slippage_bps: number;
    platform_fee_bps: number;
  
    constructor(fields: {
      id: number;
      route_plan: RoutePlanStep[];
      in_amount: bigint;
      quoted_out_amount: bigint;
      slippage_bps: number;
      platform_fee_bps: number;
    }) {
      this.id = fields.id;
      this.route_plan = fields.route_plan;
      this.in_amount = fields.in_amount;
      this.quoted_out_amount = fields.quoted_out_amount;
      this.slippage_bps = fields.slippage_bps;
      this.platform_fee_bps = fields.platform_fee_bps;
    }
  }

export const schema = new Map<any, any>([
    [
      RoutePlanStep,
      {
        kind: "struct",
        fields: [
          ["swap", "string"],
          ["percent", "u8"],
          ["input_index", "u8"],
          ["output_index", "u8"],
        ],
      },
    ],
    [
      SharedAccountsRouteArgs,
      {
        kind: "struct",
        fields: [
          ["id", "u8"],
          ["route_plan", [RoutePlanStep]],
          ["in_amount", "u64"],
          ["quoted_out_amount", "u64"],
          ["slippage_bps", "u16"],
          ["platform_fee_bps", "u8"],
        ],
      },
    ],
  ]);
  