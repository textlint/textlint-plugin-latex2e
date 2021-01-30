module.exports = {
  preset: "ts-jest",
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: 'test/*.ts$',
  globals: {
    "ts-jest": {
      "tsconfig": "tsconfig.json"
    }
  },
};
