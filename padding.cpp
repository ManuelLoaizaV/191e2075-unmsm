#include <type_traits>
#include <iostream>
using namespace std;

// int: 0, 4, 8, 12, ...
// long long: 0, 8, 16, ...
// char: 0, 1, 2, 3, ...

/*
// Esta definici'on reserva 32 bytes:
typedef struct Estructura {
	char letra;  // 1
	int edad;  // 4
	char nota;  // 1
	int ano_actual;  // 4
	long long largo;  // 8
	char inicial;  // 1
} estructura_t;
*/

// Esta definici'on reserva 24 bytes:
typedef struct Estructura {
	long long largo;  // 8
	int edad;  // 4
	int ano_actual;  // 4
	char letra;  // 1
	char nota;  // 1
	char inicial;  // 1
} estructura_t;

// Sumando, te'oricamente nuestro tipo ocupar'ia 19 bytes.

int main(void) {
	cout << alignment_of<long long>() << endl;
	cout << sizeof(estructura_t) << endl;
	return 0;
}
