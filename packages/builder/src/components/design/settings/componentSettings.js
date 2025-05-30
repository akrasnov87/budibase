import { Checkbox, Select, RadioGroup, Stepper, Input } from "@budibase/bbui"
import { licensing } from "@/stores/portal"
import { get } from "svelte/store"
import DataSourceSelect from "./controls/DataSourceSelect/DataSourceSelect.svelte"
import S3DataSourceSelect from "./controls/S3DataSourceSelect.svelte"
import DataProviderSelect from "./controls/DataProviderSelect.svelte"
import ButtonActionEditor from "./controls/ButtonActionEditor/ButtonActionEditor.svelte"
import TableSelect from "./controls/TableSelect.svelte"
import ColorPicker from "./controls/ColorPicker.svelte"
import { IconSelect } from "./controls/IconSelect"
import FieldSelect from "./controls/FieldSelect.svelte"
import SortableFieldSelect from "./controls/SortableFieldSelect.svelte"
import MultiFieldSelect from "./controls/MultiFieldSelect.svelte"
import SearchFieldSelect from "./controls/SearchFieldSelect.svelte"
import SchemaSelect from "./controls/SchemaSelect.svelte"
import SectionSelect from "./controls/SectionSelect.svelte"
import FilterEditor from "./controls/FilterEditor/FilterEditor.svelte"
import URLSelect from "./controls/URLSelect.svelte"
import OptionsEditor from "./controls/OptionsEditor/OptionsEditor.svelte"
import FormFieldSelect from "./controls/FormFieldSelect.svelte"
import ValidationEditor from "./controls/ValidationEditor/ValidationEditor.svelte"
import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"
import ColumnEditor from "./controls/ColumnEditor/ColumnEditor.svelte"
import BasicColumnEditor from "./controls/ColumnEditor/BasicColumnEditor.svelte"
import TopLevelColumnEditor from "./controls/ColumnEditor/TopLevelColumnEditor.svelte"
import GridColumnEditor from "./controls/GridColumnConfiguration/GridColumnConfiguration.svelte"
import BarButtonList from "./controls/BarButtonList.svelte"
import FieldConfiguration from "./controls/FieldConfiguration/FieldConfiguration.svelte"
import FilterConfiguration from "./controls/FilterConfiguration/FilterConfiguration.svelte"
import ButtonConfiguration from "./controls/ButtonConfiguration/ButtonConfiguration.svelte"
import RelationshipFilterEditor from "./controls/RelationshipFilterEditor.svelte"
import FormStepConfiguration from "./controls/FormStepConfiguration.svelte"
import FormStepControls from "./controls/FormStepControls.svelte"
import PaywalledSetting from "./controls/PaywalledSetting.svelte"
import TableConditionEditor from "./controls/TableConditionEditor.svelte"
import MultilineDrawerBindableInput from "@/components/common/MultilineDrawerBindableInput.svelte"
import FilterableSelect from "./controls/FilterableSelect.svelte"

const componentMap = {
  text: DrawerBindableInput,
  "text/multiline": MultilineDrawerBindableInput,
  plainText: Input,
  select: Select,
  radio: RadioGroup,
  dataSource: DataSourceSelect,
  "dataSource/s3": S3DataSourceSelect,
  "dataSource/filterable": FilterableSelect,
  dataProvider: DataProviderSelect,
  boolean: Checkbox,
  number: Stepper,
  event: ButtonActionEditor,
  table: TableSelect,
  color: ColorPicker,
  icon: IconSelect,
  field: FieldSelect,
  multifield: MultiFieldSelect,
  searchfield: SearchFieldSelect,
  options: OptionsEditor,
  schema: SchemaSelect,
  section: SectionSelect,
  filter: FilterEditor,
  "filter/relationship": RelationshipFilterEditor,
  url: URLSelect,
  fieldConfiguration: FieldConfiguration,
  filterConfiguration: FilterConfiguration,
  buttonConfiguration: ButtonConfiguration,
  stepConfiguration: FormStepConfiguration,
  formStepControls: FormStepControls,
  columns: ColumnEditor,
  // "Basic" actually includes nested JSON and relationship fields
  "columns/basic": BasicColumnEditor,
  // "Top level" is only the top level schema fields
  "columns/toplevel": TopLevelColumnEditor,
  "columns/grid": GridColumnEditor,
  tableConditions: TableConditionEditor,
  "field/sortable": SortableFieldSelect,
  "field/string": FormFieldSelect,
  "field/number": FormFieldSelect,
  "field/bigint": FormFieldSelect,
  "field/options": FormFieldSelect,
  "field/boolean": FormFieldSelect,
  "field/longform": FormFieldSelect,
  "field/datetime": FormFieldSelect,
  "field/attachment": FormFieldSelect,
  "field/attachment_single": FormFieldSelect,
  "field/s3": Input,
  "field/link": FormFieldSelect,
  "field/array": FormFieldSelect,
  "field/json": FormFieldSelect,
  "field/barcodeqr": FormFieldSelect,
  "field/signature_single": FormFieldSelect,
  "field/bb_reference": FormFieldSelect,
  "field/bb_reference_single": FormFieldSelect,
  // Some validation types are the same as others, so not all types are
  // explicitly listed here. e.g. options uses string validation
  "validation/string": ValidationEditor,
  "validation/array": ValidationEditor,
  "validation/number": ValidationEditor,
  "validation/boolean": ValidationEditor,
  "validation/datetime": ValidationEditor,
  "validation/attachment": ValidationEditor,
  "validation/attachment_single": ValidationEditor,
  "validation/signature_single": ValidationEditor,
  "validation/link": ValidationEditor,
  "validation/bb_reference": ValidationEditor,
}

export const getComponentForSetting = setting => {
  const { type, showInBar, barStyle, license } = setting || {}
  if (!type) {
    return null
  }

  // Check for paywalled settings
  if (license && get(licensing).isFreePlan) {
    return PaywalledSetting
  }

  // We can show a clone of the bar settings for certain select settings
  if (showInBar && type === "select" && barStyle === "buttons") {
    return BarButtonList
  }

  return componentMap[type]
}
