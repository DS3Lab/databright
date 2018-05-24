extern crate rusty_machine;
extern crate rulinalg;

mod knn_shapley {
    use knn_shapley::rusty_machine::linalg::Matrix;
    use knn_shapley::rusty_machine::linalg::Vector;
    use knn_shapley::rusty_machine::prelude::BaseMatrix;
    use knn_shapley::rusty_machine::linalg::Metric;
    use std::cmp::min;

    fn distance_from_sample(training_features: &Matrix<f64>, test_sample: &Vector<f64>) -> Vec<f64> {
        return training_features.iter_rows()
                                .map(|row| (Vector::new(row) - test_sample).norm())
                                .collect();
    }

    fn shapleys_from_distances(distances: Vector<f64>, training_labels: Vector<i32>, test_label: i32, k: i8) -> Vec<f64> {
        let num_training_labels = distances.size();
        let shapleys = vec![0; num_training_labels];
        let mut training_idx = num_training_labels;
        let mut lastvalue = 0;
        let mut lastkey = -1;

        let sorted_distances = distances.iter().enumerate().sort_by(|(idx_a, val_a),(idx_b, val_b)| val_b.partial_cmp(val_a).unwrap());
        for (key, dist) in sorted_distances {
            if training_idx == num_training_labels {
                lastvalue = 0;
            } else {
                let numerator = ((training_labels[key] == test_label) as f64) - ((training_labels[lastkey] == test_label) as f64) * (min(k-1, training_idx-1) + 1);
                let denominator = k * training_idx;
                lastvalue += numerator/denominator;
            }

            lastkey = key;
            shapleys[key] = lastvalue;
        }

        return shapleys;
    }
    pub fn calculate_knn_shapleys(training_features: Matrix<f64>, training_labels: Vector<i32> , test_features: Matrix<f64>, test_labels: Vector<i32>, k: i8) {
        assert_eq!(training_features.rows(), training_labels.size());
        assert_eq!(test_features.rows(), test_labels.size());
        assert_eq!(training_features.cols(), test_features.cols());

        test_features.iter_rows().enumerate()
                     .map(|(idx, row)| (idx, distance_from_sample(&training_features, &Vector::new(row)) ))
                     .map(|(idx, dist)| shapleys_from_distances(dist, training_labels, test_labels[idx], k))
                     .fold(vec![0,training_labels.size()], |sum_vec, shapleys| sum_vec + shapleys);
    }
}