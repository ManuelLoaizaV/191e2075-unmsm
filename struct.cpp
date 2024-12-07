#include <iostream>
using namespace std;

 typedef struct Coordenadas {
	int x;
	int y;
	int z;
	string nombre;
} coordenadas_t;

coordenadas_t nueva_coordenadas(int x, int y, int z, string nombre) {
	coordenadas_t coordenadas = {
		.x = x,
		.y = y,
		.z = z,
		.nombre = nombre
	};
	return coordenadas;
}

coordenadas_t escalar_coordenadas(coordenadas_t coordenadas, int factor) {
	coordenadas_t escaladas = coordenadas;
	escaladas.x *= factor;
	escaladas.y *= factor;
	escaladas.z *= factor;
	return escaladas;
}

void imprimir(coordenadas_t c) {
	cout << c.nombre << " (" << c.x << ", " << c.y << ", " << c.z << ")" << endl;
}

int main(void) {
	// struct Coordenadas p = {0};
	// struct Coordenadas p = {3, 4, 5, "Carlos"};
	coordenadas_t p = nueva_coordenadas(3, 5, 4, "Carlos");
	imprimir(p);

	coordenadas_t q = nueva_coordenadas(9, 8, 7, "Jhon");
	imprimir(q);

	coordenadas_t r = escalar_coordenadas(p, 3);
	imprimir(r);

	return 0;
}

