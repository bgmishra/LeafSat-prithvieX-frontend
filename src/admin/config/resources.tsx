import { z } from "zod";
import type { ResourceConfig } from "@/admin/types/resources";

const requiredText = z.string().trim().min(1, "This field is required");
const optionalText = z.string().trim().optional();
const optionalBoolean = z.boolean().optional();

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    return undefined;
  }

  return Number(value);
}, z.number("Enter a valid number").optional());

const nullablePositiveInteger = z.preprocess((value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  ) {
    return null;
  }

  return Number(value);
}, z.number("Enter a valid number").int("Enter a whole number").nonnegative("Enter zero or a positive number").nullable());

const requiredNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    return undefined;
  }

  return Number(value);
}, z.number("Enter a valid number").int().positive("Enter a positive number"));

const optionalDecimal = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return String(value);
}, z.string().trim().optional());

const nullableDecimal = z.preprocess((value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  ) {
    return null;
  }

  return String(value);
}, z.string().trim().nullable());

const optionalId = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}, z.number("Select a valid item").optional());

const requiredId = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}, z.number("Select a valid item"));

const optionalDate = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return String(value);
}, z.string().optional());

function textValue(value: unknown) {
  if (value == null || value === "") {
    return "-";
  }

  return String(value);
}

function booleanValue(value: unknown) {
  return value ? "Yes" : "No";
}

function relatedValue(item: Record<string, unknown>, key: string) {
  const value = item[key];

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return textValue(
      record.name_label ??
        record.name ??
        record.source_name_label ??
        record.source_name ??
        record.atmos_press_level_label ??
        record.atmos_press_level ??
        record.model_name_label ??
        record.model_name ??
        record.scenario_name_label ??
        record.scenario_name ??
        record.temporal_type_label ??
        record.temporal_type ??
        record.temporal_resolution_meter ??
        record.duration_unit_name ??
        record.service_type_name ??
        record.email ??
        record.full_name ??
        record.username ??
        record.id,
    );
  }

  return textValue(value);
}

function listValue(item: Record<string, unknown>, key: string, labelKeys: string[]) {
  const values = item[key];

  if (!Array.isArray(values)) {
    return "-";
  }

  return values
    .map((value) => {
      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        for (const labelKey of labelKeys) {
          if (record[labelKey] != null && record[labelKey] !== "") {
            return record[labelKey];
          }
        }

        return record.id;
      }

      return value;
    })
    .join(", ");
}

function temporalTypesValue(item: Record<string, unknown>) {
  return listValue(item, "temporal_resolution_types", ["temporal_type_label", "temporal_type", "name_label", "name"]);
}

function dataSourcesValue(item: Record<string, unknown>) {
  return listValue(item, "data_sources", ["source_name_label", "source_name", "name_label", "name"]);
}

function modelNamesValue(item: Record<string, unknown>) {
  return listValue(item, "model_names", ["model_name_label", "model_name", "name_label", "name"]);
}

function scenarioNamesValue(item: Record<string, unknown>) {
  return listValue(item, "scenario_names", ["scenario_name_label", "scenario_name", "name_label", "name"]);
}

function atmosphericPressureLevelsValue(item: Record<string, unknown>) {
  return listValue(item, "atmospheric_pressure_levels", ["atmos_press_level_label", "atmos_press_level", "name_label", "name"]);
}

function meterValue(value: unknown) {
  if (value == null || value === "") {
    return "-";
  }

  return `${String(value)} m`;
}

function dateValue(value: unknown) {
  if (typeof value !== "string") {
    return textValue(value);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function boundarySummaryValue(value: unknown) {
  if (!value || typeof value !== "object") {
    return "-";
  }

  const geometry = value as { type?: string; coordinates?: unknown[] };

  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    const count = geometry.coordinates.length;
    return `${count} polygon${count === 1 ? "" : "s"}`;
  }

  if (geometry.type === "Polygon") {
    return "1 polygon";
  }

  return "-";
}

const serviceTypeField = {
  label: "Service type",
  name: "service_name",
  optionSource: { endpoint: "/api/v1/service-types/", labelKey: "service_type_name" },
  type: "select" as const,
};

export const resourceConfigs = {
  serviceAnalysis: {
    columns: [
      { key: "id", label: "ID" },
      { key: "service_name", label: "Service type", render: (item) => relatedValue(item, "service_name") },
      { key: "name_label", label: "Label" },
      { key: "name_value", label: "Value" },
      { key: "python_module", label: "Python module", render: (item) => textValue(item.python_module) },
      { key: "palette_name", label: "Palette", render: (item) => textValue(item.palette_name) },
      { key: "reverse_palette", label: "Reverse", render: (item) => booleanValue(item.reverse_palette) },
      { key: "invert_palette", label: "Invert", render: (item) => booleanValue(item.invert_palette) },
      { key: "unit", label: "Unit", render: (item) => textValue(item.unit) },
      { key: "display_order", label: "Order", render: (item) => textValue(item.display_order) },
      { key: "temporal_resolution_types", label: "Temporal types", render: temporalTypesValue },
      { key: "data_sources", label: "Data sources", render: dataSourcesValue },
    ],
    description: "Manage service modules. Data sources, pricing, dates, and resolutions are configured in the service data-source table below.",
    endpoint: "/api/v1/services/",
    fields: [
      serviceTypeField,
      { label: "Label", name: "name_label", required: true, type: "text" },
      { label: "Value", name: "name_value", required: true, type: "text" },
      { label: "Python module", name: "python_module", type: "text" },
      { label: "Palette name", name: "palette_name", type: "text" },
      { label: "Reverse palette", name: "reverse_palette", type: "boolean" },
      { label: "Invert palette", name: "invert_palette", type: "boolean" },
      { label: "Unit", name: "unit", type: "text" },
      { label: "Display order", name: "display_order", type: "number" },
    ],
    defaultValues: {
      reverse_palette: false,
      invert_palette: false,
    },
    key: "service-analysis",
    path: "/admin/services",
    schema: z.object({
      service_name: optionalId,
      name_label: requiredText,
      name_value: requiredText,
      python_module: optionalText,
      palette_name: optionalText,
      reverse_palette: optionalBoolean,
      invert_palette: optionalBoolean,
      unit: optionalText,
      display_order: optionalNumber,
    }),
    title: "Services",
  },
  serviceDataSources: {
    columns: [
      { key: "id", label: "ID" },
      { key: "service_name", label: "Service" },
      { key: "data_source_name", label: "Data source" },
      { key: "temporal_resolution_type_name", label: "Temporal type" },
      { key: "spatial_resolution_meter", label: "Spatial resolution", render: (item) => meterValue(item.spatial_resolution_meter) },
      { key: "minimum_start_date", label: "Start date", render: (item) => dateValue(item.minimum_start_date) },
      { key: "maximum_end_date", label: "End date", render: (item) => dateValue(item.maximum_end_date) },
      { key: "max_range_to_select", label: "Max range", render: (item) => textValue(item.max_range_to_select) },
      { key: "base_price", label: "Base price", render: (item) => textValue(item.base_price) },
      { key: "area_with_base_price_ha", label: "Base area ha", render: (item) => textValue(item.area_with_base_price_ha) },
      { key: "min_area_allowed_ha_per_ploy", label: "Min area per polygon (ha)", render: (item) => textValue(item.min_area_allowed_ha_per_ploy) },
      { key: "max_area_allowed_ha_per_ploy", label: "Max area per polygon (ha)", render: (item) => textValue(item.max_area_allowed_ha_per_ploy) },
      { key: "max_total_area_all_poly_aoi_ha", label: "Max total AOI area (ha)", render: (item) => textValue(item.max_total_area_all_poly_aoi_ha) },
    ],
    description: "Attach data sources to services and define temporal, spatial, date, and pricing rules.",
    endpoint: "/api/v1/service-temporal-frequency-types/",
    fields: [
      {
        label: "Service",
        name: "service",
        optionSource: { endpoint: "/api/v1/services/", labelKey: "name_label" },
        required: true,
        type: "select",
      },
      {
        label: "Data source",
        name: "data_source",
        optionSource: { endpoint: "/api/v1/data-sources/", labelKey: "source_name_label" },
        required: true,
        type: "select",
      },
      {
        label: "Temporal resolution type",
        name: "temporal_resolution_type",
        optionSource: { endpoint: "/api/v1/temporal-resolution-types/", labelKey: "temporal_type_label" },
        required: true,
        type: "select",
      },
      {
        label: "Spatial resolution type",
        name: "spatial_resolution_type",
        optionSource: { endpoint: "/api/v1/spatial-resolution-types/", labelKey: "temporal_resolution_meter" },
        required: true,
        type: "select",
      },
      { label: "Minimum start date", name: "minimum_start_date", type: "date" },
      { label: "Maximum end date", name: "maximum_end_date", type: "date" },
      { label: "Max range to select", name: "max_range_to_select", type: "number" },
      { label: "Base price", name: "base_price", type: "money" },
      { label: "Area with base price (ha)", name: "area_with_base_price_ha", type: "money" },
      { label: "Minimum area per polygon (ha)", name: "min_area_allowed_ha_per_ploy", type: "money" },
      { label: "Maximum area per polygon (ha)", name: "max_area_allowed_ha_per_ploy", type: "money" },
      { label: "Maximum total AOI area (ha)", name: "max_total_area_all_poly_aoi_ha", type: "money" },
    ],
    key: "service-data-sources",
    path: "/admin/services",
    schema: z.object({
      service: requiredId,
      data_source: requiredId,
      temporal_resolution_type: requiredId,
      spatial_resolution_type: requiredId,
      minimum_start_date: optionalDate,
      maximum_end_date: optionalDate,
      max_range_to_select: nullablePositiveInteger,
      base_price: optionalDecimal,
      area_with_base_price_ha: optionalDecimal,
      min_area_allowed_ha_per_ploy: nullableDecimal,
      max_area_allowed_ha_per_ploy: nullableDecimal,
      max_total_area_all_poly_aoi_ha: nullableDecimal,
    }),
    title: "Service Data Source",
  },
  cmip6Services: {
    columns: [
      { key: "id", label: "ID" },
      { key: "service_name", label: "Service type", render: (item) => relatedValue(item, "service_name") },
      { key: "name_label", label: "Label" },
      { key: "name_value", label: "Value" },
      { key: "palette_name", label: "Palette", render: (item) => textValue(item.palette_name) },
      { key: "reverse_palette", label: "Reverse", render: (item) => booleanValue(item.reverse_palette) },
      { key: "invert_palette", label: "Invert", render: (item) => booleanValue(item.invert_palette) },
      { key: "unit", label: "Unit", render: (item) => textValue(item.unit) },
      { key: "display_order", label: "Order", render: (item) => textValue(item.display_order) },
      { key: "temporal_resolution_types", label: "Temporal types", render: temporalTypesValue },
      { key: "atmospheric_pressure_levels", label: "Pressure levels", render: atmosphericPressureLevelsValue },
      { key: "model_names", label: "Models", render: modelNamesValue },
      { key: "scenario_names", label: "Scenarios", render: scenarioNamesValue },
    ],
    description: "Manage CMIP6 service modules. Models, scenarios, pricing, dates, and resolutions are configured in the CMIP6 service source table below.",
    endpoint: "/api/v1/cmip6-services/",
    fields: [
      serviceTypeField,
      { label: "Label", name: "name_label", required: true, type: "text" },
      { label: "Value", name: "name_value", required: true, type: "text" },
      { label: "Palette name", name: "palette_name", type: "text" },
      { label: "Reverse palette", name: "reverse_palette", type: "boolean" },
      { label: "Invert palette", name: "invert_palette", type: "boolean" },
      { label: "Unit", name: "unit", type: "text" },
      { label: "Display order", name: "display_order", type: "number" },
    ],
    defaultValues: {
      reverse_palette: false,
      invert_palette: false,
    },
    key: "cmip6-services",
    path: "/admin/cmip6-services",
    schema: z.object({
      service_name: optionalId,
      name_label: requiredText,
      name_value: requiredText,
      palette_name: optionalText,
      reverse_palette: optionalBoolean,
      invert_palette: optionalBoolean,
      unit: optionalText,
      display_order: optionalNumber,
    }),
    title: "CMIP6 Services",
  },
  cmip6ServiceSources: {
    columns: [
      { key: "id", label: "ID" },
      { key: "service_name", label: "Service" },
      { key: "atmospheric_pressure_level_name", label: "Pressure level" },
      { key: "model_name_name", label: "Model" },
      { key: "scenario_name_name", label: "Scenario" },
      { key: "temporal_resolution_type_name", label: "Temporal type" },
      { key: "spatial_resolution_meter", label: "Spatial resolution", render: (item) => meterValue(item.spatial_resolution_meter) },
      { key: "minimum_start_date", label: "Start date", render: (item) => dateValue(item.minimum_start_date) },
      { key: "maximum_end_date", label: "End date", render: (item) => dateValue(item.maximum_end_date) },
      { key: "max_range_to_select", label: "Max range", render: (item) => textValue(item.max_range_to_select) },
      { key: "base_price", label: "Base price", render: (item) => textValue(item.base_price) },
      { key: "area_with_base_price_ha", label: "Base area ha", render: (item) => textValue(item.area_with_base_price_ha) },
      { key: "min_area_allowed_ha_per_ploy", label: "Min area per polygon (ha)", render: (item) => textValue(item.min_area_allowed_ha_per_ploy) },
      { key: "max_area_allowed_ha_per_ploy", label: "Max area per polygon (ha)", render: (item) => textValue(item.max_area_allowed_ha_per_ploy) },
      { key: "max_total_area_all_poly_aoi_ha", label: "Max total AOI area (ha)", render: (item) => textValue(item.max_total_area_all_poly_aoi_ha) },
    ],
    description: "Attach CMIP6 models and scenarios to services and define temporal, spatial, date, and pricing rules.",
    endpoint: "/api/v1/cmip6-service-sources/",
    fields: [
      {
        label: "CMIP6 service",
        name: "service",
        optionSource: { endpoint: "/api/v1/cmip6-services/", labelKey: "name_label" },
        required: true,
        type: "select",
      },
      {
        label: "Pressure level",
        name: "atmospheric_pressure_level",
        optionSource: { endpoint: "/api/v1/atmospheric-pressure-levels-cmip6/", labelKey: "atmos_press_level_label" },
        type: "select",
      },
      {
        label: "Model name",
        name: "model_name",
        optionSource: { endpoint: "/api/v1/data-source-model-names/", labelKey: "model_name_label" },
        required: true,
        type: "select",
      },
      {
        label: "Scenario name",
        name: "scenario_name",
        optionSource: { endpoint: "/api/v1/scenario-names/", labelKey: "scenario_name_label" },
        required: true,
        type: "select",
      },
      {
        label: "Temporal resolution type",
        name: "temporal_resolution_type",
        optionSource: { endpoint: "/api/v1/temporal-resolution-types/", labelKey: "temporal_type_label" },
        required: true,
        type: "select",
      },
      {
        label: "Spatial resolution type",
        name: "spatial_resolution_type",
        optionSource: { endpoint: "/api/v1/spatial-resolution-types/", labelKey: "temporal_resolution_meter" },
        required: true,
        type: "select",
      },
      { label: "Minimum start date", name: "minimum_start_date", type: "date" },
      { label: "Maximum end date", name: "maximum_end_date", type: "date" },
      { label: "Max range to select", name: "max_range_to_select", type: "number" },
      { label: "Base price", name: "base_price", type: "money" },
      { label: "Area with base price (ha)", name: "area_with_base_price_ha", type: "money" },
      { label: "Minimum area per polygon (ha)", name: "min_area_allowed_ha_per_ploy", type: "money" },
      { label: "Maximum area per polygon (ha)", name: "max_area_allowed_ha_per_ploy", type: "money" },
      { label: "Maximum total AOI area (ha)", name: "max_total_area_all_poly_aoi_ha", type: "money" },
    ],
    key: "cmip6-service-sources",
    path: "/admin/cmip6-services",
    schema: z.object({
      service: requiredId,
      atmospheric_pressure_level: optionalId,
      model_name: requiredId,
      scenario_name: requiredId,
      temporal_resolution_type: requiredId,
      spatial_resolution_type: requiredId,
      minimum_start_date: optionalDate,
      maximum_end_date: optionalDate,
      max_range_to_select: nullablePositiveInteger,
      base_price: optionalDecimal,
      area_with_base_price_ha: optionalDecimal,
      min_area_allowed_ha_per_ploy: nullableDecimal,
      max_area_allowed_ha_per_ploy: nullableDecimal,
      max_total_area_all_poly_aoi_ha: nullableDecimal,
    }),
    title: "CMIP6 Service Source",
  },
  dataSources: {
    columns: [
      { key: "id", label: "ID" },
      { key: "source_name_label", label: "Label" },
      { key: "source_name_value", label: "Value" },
      { key: "is_free", label: "Free", render: (item) => booleanValue(item.is_free) },
    ],
    description: "Define source names that can be attached to service products.",
    endpoint: "/api/v1/data-sources/",
    fields: [
      { label: "Label", name: "source_name_label", required: true, type: "text" },
      { label: "Value", name: "source_name_value", required: true, type: "text" },
      { label: "Free data source", name: "is_free", type: "boolean" },
    ],
    defaultValues: {
      is_free: false,
    },
    key: "data-sources",
    path: "/admin/data-sources",
    schema: z.object({
      source_name_label: requiredText,
      source_name_value: requiredText,
      is_free: optionalBoolean,
    }),
    title: "Data Source",
  },
  atmosphericPressureLevelsCmip6: {
    columns: [
      { key: "id", label: "ID" },
      { key: "atmos_press_level_label", label: "Label" },
      { key: "atmos_press_level_value", label: "Value" },
    ],
    description: "Define CMIP6 atmospheric pressure levels. Values are strings for backend processing keys.",
    endpoint: "/api/v1/atmospheric-pressure-levels-cmip6/",
    fields: [
      { label: "Label", name: "atmos_press_level_label", required: true, type: "text" },
      { label: "Value", name: "atmos_press_level_value", required: true, type: "text" },
    ],
    key: "atmospheric-pressure-levels-cmip6",
    path: "/admin/atmospheric-pressure-levels-cmip6",
    schema: z.object({ atmos_press_level_label: requiredText, atmos_press_level_value: requiredText }),
    title: "CMIP6 Atmospheric Pressure Level",
  },
  dataSourceModelNames: {
    columns: [
      { key: "id", label: "ID" },
      { key: "model_name_label", label: "Label" },
      { key: "model_name_value", label: "Value" },
    ],
    description: "Define CMIP6 data source model names that can be attached to CMIP6 services.",
    endpoint: "/api/v1/data-source-model-names/",
    fields: [
      { label: "Label", name: "model_name_label", required: true, type: "text" },
      { label: "Value", name: "model_name_value", required: true, type: "text" },
    ],
    key: "data-source-model-names",
    path: "/admin/data-source-model-names",
    schema: z.object({ model_name_label: requiredText, model_name_value: requiredText }),
    title: "Data Source Model Name",
  },
  scenarioNames: {
    columns: [
      { key: "id", label: "ID" },
      { key: "scenario_name_label", label: "Label" },
      { key: "scenario_name_value", label: "Value" },
    ],
    description: "Define CMIP6 scenario names that can be attached to CMIP6 services.",
    endpoint: "/api/v1/scenario-names/",
    fields: [
      { label: "Label", name: "scenario_name_label", required: true, type: "text" },
      { label: "Value", name: "scenario_name_value", required: true, type: "text" },
    ],
    key: "scenario-names",
    path: "/admin/scenario-names",
    schema: z.object({ scenario_name_label: requiredText, scenario_name_value: requiredText }),
    title: "Scenario Name",
  },
  temporalResolutionTypes: {
    columns: [
      { key: "id", label: "ID" },
      { key: "temporal_type_label", label: "Label" },
      { key: "temporal_type_value", label: "Value" },
    ],
    description: "Define the temporal resolution choices used by extraction modules.",
    endpoint: "/api/v1/temporal-resolution-types/",
    fields: [
      { label: "Label", name: "temporal_type_label", required: true, type: "text" },
      { label: "Value", name: "temporal_type_value", required: true, type: "text" },
    ],
    key: "temporal-resolution-types",
    path: "/admin/temporal-resolution-types",
    schema: z.object({ temporal_type_label: requiredText, temporal_type_value: requiredText }),
    title: "Temporal Resolution Type",
  },
  spatialResolutionTypes: {
    columns: [
      { key: "id", label: "ID" },
      {
        key: "temporal_resolution_meter",
        label: "Spatial resolution",
        render: (item) => meterValue(item.temporal_resolution_meter),
      },
    ],
    description: "Define spatial resolution choices in meters for service data-source rules.",
    endpoint: "/api/v1/spatial-resolution-types/",
    fields: [
      {
        label: "Spatial resolution (meters)",
        name: "temporal_resolution_meter",
        required: true,
        type: "number",
      },
    ],
    key: "spatial-resolution-types",
    path: "/admin/spatial-resolution-types",
    schema: z.object({ temporal_resolution_meter: requiredNumber }),
    title: "Spatial Resolution Type",
  },
  balances: {
    canNormalUserMutate: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "user", label: "User", render: (item) => relatedValue(item, "user") },
      { key: "token", label: "Token", render: (item) => textValue(item.token) },
    ],
    description: "View and maintain wallet balances. Normal users can only manage their own balance.",
    endpoint: "/api/v1/balance/",
    fields: [
      {
        label: "User",
        name: "user",
        optionSource: { endpoint: "/api/v1/users/", labelKey: "email" },
        type: "select",
      },
      { label: "Token", name: "token", type: "money" },
    ],
    key: "balances",
    normalUserOwnResourceOnly: true,
    path: "/admin/balances",
    schema: z.object({
      user: optionalId,
      token: optionalDecimal,
    }),
    title: "Balance",
  },
  trainSections: {
    columns: [
      { key: "id", label: "ID" },
      { key: "railway_id", label: "Railway ID" },
      { key: "railway_name", label: "Railway name" },
      { key: "starting_point_name", label: "Starting point" },
      { key: "end_point_name", label: "End point" },
      { key: "section_start_name", label: "Section start" },
      { key: "section_end_name", label: "Section end" },
      { key: "section_polygon", label: "Boundary", render: (item) => boundarySummaryValue(item.section_polygon) },
    ],
    bulkUpload: {
      accept: ".gpkg",
      endpoint: "/api/v1/railway-segments/bulk-upload/",
      fieldName: "file",
      instructions: [
        "Geometry (required) — one Polygon or MultiPolygon feature per row/train section.",
        "railway_id — text, optional",
        "railway_name — text, optional",
        "starting_point_name — text, optional",
        "end_point_name — text, optional",
        "section_start_name — text, optional",
        "section_end_name — text, optional",
        "Column names are matched case-insensitively. Missing or unmatched columns are left blank. Rows with no geometry or an unsupported geometry type are skipped and reported after upload.",
      ],
      label: "Bulk Upload Train Sections",
    },
    description:
      "Manage railway train sections. Upload a GeoPackage (.gpkg) with one feature per section to create a single record, or use Bulk Upload for a file containing many sections at once.",
    geometryPreview: {
      field: "section_polygon",
      label: "Train Section Boundary",
    },
    endpoint: "/api/v1/railway-segments/",
    fields: [
      { label: "Railway ID", name: "railway_id", type: "text" },
      { label: "Railway name", name: "railway_name", type: "text" },
      { label: "Starting point", name: "starting_point_name", type: "text" },
      { label: "End point", name: "end_point_name", type: "text" },
      { label: "Section start", name: "section_start_name", type: "text" },
      { label: "Section end", name: "section_end_name", type: "text" },
      {
        accept: ".gpkg",
        geojsonFieldName: "boundary_geojson",
        helpText:
          "Upload a GeoPackage (.gpkg) file, or draw the boundary directly on the map. Required when creating; leave blank when editing to keep the existing boundary. If an uploaded file has more than one feature, all of their polygons are merged into this one record — use Bulk Upload instead to create one record per feature.",
        label: "Boundary",
        name: "boundary_file",
        required: true,
        type: "geometry",
      },
    ],
    key: "train-sections",
    path: "/admin/train-section",
    schema: z.object({
      railway_id: optionalText,
      railway_name: optionalText,
      starting_point_name: optionalText,
      end_point_name: optionalText,
      section_start_name: optionalText,
      section_end_name: optionalText,
      boundary_file: z.instanceof(File).optional(),
      boundary_geojson: z.unknown().optional(),
    }),
    title: "Train Sections",
  },
} satisfies Record<string, ResourceConfig>;

export type ResourceKey = keyof typeof resourceConfigs;
