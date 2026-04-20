/**
 * Custom ESLint rule for Norse Card Game
 * Enforces that card definitions have required properties and follow conventions
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce that card objects have required properties',
      category: 'Norse Card Game Rules',
      recommended: true,
    },
    fixable: 'code',
    schema: [], // no options
  },
  create: function(context) {
    // Helper function to check if a node is a card object
    function isCardObject(node) {
      if (node.type !== 'ObjectExpression') return false;
      
      // Check if this object has an id property
      return node.properties.some(prop => 
        prop.type === 'Property' && 
        prop.key.type === 'Identifier' && 
        prop.key.name === 'id'
      );
    }
    
    // Helper to check if property exists on card
    function hasProperty(node, propertyName) {
      return node.properties.some(prop => 
        prop.type === 'Property' && 
        prop.key.type === 'Identifier' && 
        prop.key.name === propertyName
      );
    }
    
    return {
      ObjectExpression(node) {
        if (!isCardObject(node)) return;
        
        // Required properties for all cards
        const requiredProps = ['id', 'name', 'class', 'collectible'];
        
        for (const prop of requiredProps) {
          if (!hasProperty(node, prop)) {
            context.report({
              node,
              message: `Card definition is missing required property: '${prop}'`,
              fix(fixer) {
                // For collectible, we can provide a default fix
                if (prop === 'collectible') {
                  const lastProp = node.properties[node.properties.length - 1];
                  return fixer.insertTextAfter(
                    lastProp, 
                    ',\n  collectible: true'
                  );
                }
                // For class, provide Neutral as default
                if (prop === 'class') {
                  const lastProp = node.properties[node.properties.length - 1];
                  return fixer.insertTextAfter(
                    lastProp, 
                    ',\n  class: "Neutral"'
                  );
                }
              }
            });
          }
        }
        
        // Check id range is valid
        const idProp = node.properties.find(prop => 
          prop.type === 'Property' && 
          prop.key.type === 'Identifier' && 
          prop.key.name === 'id'
        );
        
        if (idProp && idProp.value.type === 'Literal') {
          const id = idProp.value.value;
          
          // Validate ID is in allowed ranges
          if (id < 1000) {
            context.report({
              node: idProp,
              message: 'Card ID must be at least 1000'
            });
          }
        }
      }
    };
  }
};