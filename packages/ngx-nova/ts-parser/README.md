# Ts-Parser

ts-parser is a tool that helps you write code in the latest version of JavaScript/TypeScript in any text control or editor like <texarea/> or monaco editor ...etc. and compile this string to a real JavaScript runnable code.

## Installation

Install from npm repository:
```
npm install @ngx-nova/ts-parser --save
 ```
## Example

**compile from string**

```js
import { buildClassFromString } from '@ngx-nova/ts-parser';

const code =`class MyClass {
    constructor(name:string, private dob:Date) 
    { 
        this._name = name;
    }

    private _name:string;

    get currentLang():string {
        return document.documentElement.lang;
    }

    add = (a:number,b:number) =>a+b;
    substract = function(a,b) {
        return a-b;
    }

    obj = {
      firstName : 'Ahmed',
      someMethod() {
        console.log('Hello, World!');
      }
    };
  
    @Input("request")
    get req(){
        return this._req;
    }
  
    get name() {
      return this._name;
    }
    set value(value) { this._name = value; }
  
    writeToConsole(data:string){
        console.log(data);
   }
   }`;

   const MyClass = buildClassFromString(code);
   const class1 = new MyClass('ahmed',new Date());
   const name = class1.name;
   // Output: "ahmed" 
   const result = class1.substract(10,4);
   // Output: 6
```

**Parse string**

```js
import { TypeScriptParser } from '@ngx-nova/ts-parser';
 const parser = new TypeScriptParser(options);
 const program = parser.parse(code);
// Output: collection of code nodes.

```

## Notes

I built it inspiring the Babel parser [Babel](https://github.com/babel/babel)

## Further help

To get more help on the Ts-Parser you can email me at (a.bahrawy@live.com) or go check out the issues page.
