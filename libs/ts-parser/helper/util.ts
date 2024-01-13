import { IOptions } from "../types/basic";
import { ExpressionNode, IPlaceholder, Identifier } from "../types/nodes";
import { IEstreeLiteral, IParenthesized, IStringLiteral } from "../types/nodes.common";

const _defOptions: IOptions = {
    continueOnerror: false, decorators: 'legacy', sourceType: 'module', annexB: true,
    features: { throwExpressions: true }
};

export class ParserUtil {

    static verifyOptions(options?: IOptions) {
        return { ..._defOptions, ...options };
    }

    static cloneIdentifier<T extends Identifier>(node: T): T {
        // We don't need to clone `typeAnnotations` and `optional`: because
        // cloneIdentifier is only used in object shorthand and named import/export.
        // Neither of them allow type annotations after the identifier or optional identifier
        const { type, location, name } = node;
        const cloned = {} as T;
        cloned.type = type;
        cloned.location = location;
        cloned.name = name;
        return cloned;
    }
    static clonePlaceholder(node: IPlaceholder) {
        return ParserUtil.cloneIdentifier(node as unknown as Identifier);
        //    cloned.expectedNode = node.expectedNode;
    }
    static cloneStringLiteral(node: IStringLiteral | IPlaceholder) {
        const { type, location } = node;
        if (type === "Placeholder")
            return ParserUtil.clonePlaceholder(node);

        const cloned = {} as IStringLiteral;
        cloned.type = type;
        cloned.location = location;
        if (node.rawValue !== undefined)
            cloned.rawValue = node.rawValue;
        cloned.value = node.value;
        return cloned;
    }

    static isValidAmbientConstInitializer(expression: ExpressionNode, estree: boolean): boolean {
        const { type } = expression;
        if ((expression as IParenthesized).parenthesized)
            return false;
        if (estree) {
            if (type === "Literal") {
                const { value } = expression as IEstreeLiteral;
                if (typeof value === "string" || typeof value === "boolean")
                    return true;
            }
        } else {
            if (type === "StringLiteral" || type === "BooleanLiteral")
                return true;
        }
        if (ParserUtil.isNumber(expression, estree) || ParserUtil.isNegativeNumber(expression, estree))
            return true;
        if (type === "TemplateLiteral" && expression.expressions.length === 0)
            return true;
        if (ParserUtil.isPossiblyLiteralEnum(expression))
            return true;
        return false;
    }

    static isNumber(expression: ExpressionNode, estree: boolean): boolean {
        if (estree)
            return (expression.type === "Literal" && (typeof expression.value === "number" || "bigint" in expression));
        return (expression.type === "NumericLiteral" || expression.type === "BigIntLiteral");
    }
    static isNegativeNumber(expression: ExpressionNode, estree: boolean): boolean {
        if (expression.type === "UnaryExpression") {
            const { operator, argument } = expression;
            if (operator === "-" && argument && ParserUtil.isNumber(argument, estree))
                return true;
        }
        return false;
    }

    static isPossiblyLiteralEnum(expression: ExpressionNode): boolean {
        if (expression.type !== "MemberExpression")
            return false;

        const { computed, property } = expression;
        if (computed && property.type !== "StringLiteral" && (property.type !== "TemplateLiteral" || property.expressions.length > 0))
            return false;

        return ParserUtil.isUncomputedMemberExpressionChain(expression.object);
    }

    static isUncomputedMemberExpressionChain(expression: ExpressionNode): boolean {
        if (expression.type === "Identifier")
            return true;
        if (expression.type !== "MemberExpression" || expression.computed)
            return false;

        return ParserUtil.isUncomputedMemberExpressionChain(expression.object);
    }

}
