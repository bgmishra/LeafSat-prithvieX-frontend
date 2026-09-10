declare module "ol-ext/*";
declare module "ol-plus/layer/TimeDimensionTile.js" {
  import type BaseLayer from "ol/layer/Base";
  import type ImageLayer from "ol/layer/Image";

  export default class TimeDimensionTile extends BaseLayer {
    AllDateAndTimeList: unknown[];
    AllLayersList: ImageLayer[];
    initilizationStatus: boolean;
    opacity: number;
    constructor(options: Record<string, unknown>);
    layerVisibilityInitiliazation(): void;
    setInitialStartLayer(): void;
    tileLoadStart(event?: unknown): void;
    tileLoadEnd(event?: unknown): void;
  }
}
declare module "ol-plus/ui/LayerSwitcher.js" {
  import type BaseLayer from "ol/layer/Base";

  export default class LayerSwitcher {
    constructor(
      appendingDivID: string,
      layerObject: BaseLayer,
      opacitySlider: boolean,
      legendDropDown: boolean,
      customCSSClass: string,
      draggable: boolean,
    );
    setVisible(visible: boolean): void;
  }
}
