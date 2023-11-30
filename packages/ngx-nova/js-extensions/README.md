# @ngx-nova/js-extensions

A versatile utility library for Angular applications that provides a collection of helpful functions and tools to simplify common tasks, handle data manipulation, and enhance code readability.

Features:

- Date and time utilities for parsing, formatting, and comparing dates.
- Array manipulation functions for filtering, mapping, and finding elements.
- String handling functions for formatting, trimming, and converting cases.
- Object utilities for deep merging, copying, and extracting subsets of objects.
- Number formatting functions for displaying numbers in various formats.
- Guid generation and validation functions.
- Common checks for different types of values (strings, arrays, objects, etc.).
- Convenient file size formatting for displaying file sizes in a human-readable format.

This utility library aims to boost productivity and enhance the development experience for Javasript/Typescript developers by offering well-tested and performant functions that address common programming challenges.

## Installation

You can install this library using npm:

```bash
npm install @ngx-nova/js-extensions
```

## Usage

```typescript
import { is, dates, array, objects, strings, number, json, GUID, to } from "@ngx-nova/js-extensions";
```

# is

```typescript
const x = 10;
if (is.number(x)) {
  // do some thing
}
is.empty([]); //Output: true
is.empty([1, 2]); //Output: false
is.empty(null); //Output: true
is.empty({}); //Output: true
is.empty({ city: "dallas" }); //Output: false

is.equal([1, 2, 3], [2, 1, 3]); //Output: true
is.equal({ city: "dallas", state: "TX" }, { state: "TX", city: "dallas" }); //Output: true
```

# dates

```typescript
dates.parse("2023-07-29", "yyyy-MM-dd"); // Output: date Object
dates.parse(new Date(2023, 10, 5), "yyyy/MM/dd"); // Output: 2023/10/05
getMonthNames("long"); // Output: ['January','February' ...]
getMonthNames("long", "ar"); // Output: ['يناير','فبراير' ...]
// and many others.
```

# to

```typescript
to.int("13.45"); // Output: 13
to.number("13.45"); // Output: 13.45
to.date("2023-07-29", "yyyy-MM-dd"); // Output: Date Object
to.valueType("202.29", "number"); // Output: 202.29
to.boolean("true"); // Output: true
to.boolean(1); // Output: true
to.boolean("2"); // Output: true
to.boolean("0"); // Output: false
```

# arrays

```typescript
unique([2, 3, 1, 4, 3, 6, 1]); // Output: [2,3,1,4,6]
enumerableRange(5, 12); // Output: [5, 6, 7, 8, 9, 10, 11, 12]
const value = [3, 4, 5];
remove(value, 4); // Output: 1 index of removed item
// value now is [3,5]
remove(value, 9); // Output: -1 value does not contain 9
intersect([1, 3, 6, 9, 4], [6, 3, 5]); // Output: [3, 6]
sum([3, 4, 5]); // Output: 12

const array = [
  { no: 1, fee: 20.5, amount: 400, description: "something" },
  { no: 2, fee: 18, amount: 300, description: "something2" },
  { no: 3, fee: 2, amount: 40, description: "something3" },
];

sum(array, (item) => item.amount); // Output: 740
```

# numbers

```typescript
padStart(10, 4, "0"); // Output: "0010"
format(14567, "#,###.00"); // Output: "14,567.00"
format(0.145, "#.00%"); // Output: "14.50%"
hasFlag(11, 4); // Output: false since 11 can't constructed from 4 // = 1 + 2 + 8 // 0^2 + 1^2 + 2^3
toBitValues(15); // OutPut: [1, 2, 4, 8]  // 0^1 + 1^2 + 2^2 + 2^3 = 15
between(6, 3, 10); // Output: true  10 <= 6 >= 3
between(8, 11, 12); // Output: false
formatFileSize(12405034567); // Output: "11.55 GB"
formatFileSize(12405034567, "ar"); // Output: "11.55 غيغابايت"
formatFileSize(12405034567, "fr"); // Output: "11.55 Go"
```

# objects

```typescript
merge(); // Merges multiple objects together, combining their properties into a single object.
copy(); // perform deep co
subset(); //
```

# strings

```typescript
const person = {
  name: "John",
  address: {
    state: "TX",
    city: "Dallas",
    street: "120 Dol",
  },
};

formatBy("{name} is a good person and he lives in {address.street} {address.city}, {address.state}", person);
// Output: "John is a good person and he lives in 120 Dol Dallas, TX";

trimTrailing("xydataxyxyxy", "xy"); // Output: "xydata"
trimHead("xydataxyxyxy", "xy"); // Output: "dataxyxyxy"
toCamelCase("Trade No"); // Output: "tradeNo"
toCamelCase("Trade_No"); // Output: "tradeNo"
toFirstUpperCase("something"); // Output: "Something"

```
# json

```typescript

forEach() // Iterate in JSON object like an array with callback (key,value)
map() // // Map a JSON object like an array with callback (key,value) to another JSON object.

const obj = {
  widget: {
    debug: "on",
    window: {
      name: "main_window",
      width: 500,
      height: 500,
    },
    image: {
      src: "Images/Sun.png",
      name: "sun1",
      hOffset: 250,
      vOffset: 250,
      alignment: "center",
    },
  },
};
flatten(obj);
// Output:
{
  "widget_debug": "on",
  "widget_window_name": "main_window",
  "widget_window_width": 500,
  "widget_window_height": 500,
  "widget_image_src": "Images/Sun.png",
  "widget_image_name": "sun1",
  "widget_image_hOffset": 250,
  "widget_image_vOffset": 250,
  "widget_image_alignment": "center"
}
```
